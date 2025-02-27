import os
import csv
import subprocess
import joblib
import torch
import chemprop
import numpy as np
import logging
from time import time
from numpy.linalg import norm
import pandas as pd
from rdkit import Chem
from rdkit.Chem import AllChem
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, request, jsonify
from constants import mean_vectors
from chemprop import data, featurizers, models
from lightning import pytorch as pl
from lightning.pytorch.accelerators import find_usable_cuda_devices
from io import StringIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

logging_level = logging.DEBUG
logging.basicConfig(level=logging_level)

def is_malformed(smiles):
  try:
    mol = Chem.MolFromSmiles(smiles)
    return mol is None
  except Exception as e:
    logging.error(f"Error validating SMILES '{smiles}': {str(e)}")
    return True

def convert_to_smiles(molecule):
  if "M  END" in molecule:
    try:
      mol = Chem.MolFromMolBlock(molecule)
      return Chem.MolToSmiles(mol) if mol else ''
    except Exception as e:
      logging.error(f"Error converting molblock to SMILES: {str(e)}")
      return None
  return molecule

def parallel_process_smiles(smis):
  with ThreadPoolExecutor(max_workers=8) as executor:
    valid_smiles = list(executor.map(convert_to_smiles, smis))
  return valid_smiles

def make_chemprop_predictions(df_test, checkpoint_path, batch_size=512):
  # Check for GPU availability
  device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

  # Load the model onto the appropriate device
  mpnn = models.MPNN.load_from_checkpoint(checkpoint_path, map_location=device)

  smis = df_test.iloc[:, 0].tolist()
  valid_indices = [i for i, smi in enumerate(smis) if not is_malformed(smi) and smi != '']
  valid_smiles = [smis[i] for i in valid_indices]
  invalid_indices = [i for i in range(len(smis)) if i not in valid_indices]

  if not valid_smiles:
    return np.array([""] * len(smis), dtype=object)

  test_data = [data.MoleculeDatapoint.from_smi(smi) for smi in valid_smiles]
  featurizer = featurizers.SimpleMoleculeMolGraphFeaturizer()
  test_dset = data.MoleculeDataset(test_data, featurizer=featurizer)

  test_loader = data.build_dataloader(
    test_dset,
    shuffle=False,
    batch_size=batch_size
  )

  logging.debug('Check GPU availability')
  logging.debug(f"CUDA available: {torch.cuda.is_available()}")

  if torch.cuda.is_available():
    logging.debug(f"Usable CUDA devices: {find_usable_cuda_devices(1)}")
  else:
    logging.debug("No usable CUDA devices found. Using CPU.")

  logging.debug(f'Model device: {next(mpnn.parameters()).device}')

  with torch.inference_mode():
    trainer = pl.Trainer(
      logger=True,
      enable_progress_bar=True,
      accelerator="gpu" if torch.cuda.is_available() else "cpu",  # Use GPU if available, else CPU
      devices=1,
      precision=16 if torch.cuda.is_available() else 32   # Enable mixed precision if using GPU, otherwise default
    )
    test_preds = trainer.predict(mpnn, test_loader)

  test_preds = [pred.item() for batch in test_preds for pred in batch]
  for index in invalid_indices:
    test_preds.insert(index, "")

  return np.array(test_preds, dtype=object)

def generate_fingerprint(smiles):
  mol = Chem.MolFromSmiles(smiles)
  if mol:
    fingerprint = AllChem.GetMorganFingerprintAsBitVect(mol, 2, nBits=1024)
    return list(map(int, fingerprint))
  return None

def calculate_similarity(mean_vector, fingerprint):
  return np.dot(mean_vector, fingerprint) / (norm(mean_vector) * norm(fingerprint))

def calculate_chemprop_probability(smiles_list, model):
  mean_vector = mean_vectors[model]
  return [
    calculate_similarity(mean_vector, generate_fingerprint(smiles))
    if generate_fingerprint(smiles) else 0.0
    for smiles in smiles_list
  ]

def find_model(model):
  files_in_dir = os.listdir()
  model_name = next(
    (file for file in files_in_dir if model.lower() in file.lower() and file.lower().endswith('.ckpt')),
    None
  )
  return model_name

def predict_for_model(model, df_test, add_probability):
  model_name = find_model(model)
  if not model_name:
    raise ValueError(f"No matching model extension found for model '{model}'")

  start = time()
  predictions = make_chemprop_predictions(df_test, model_name)
  logging.debug(f'Chemprop prediction for {model} took {time() - start}')
  df = pd.DataFrame(predictions, columns=[model])
  if add_probability:
    probabilities = calculate_chemprop_probability(df_test.iloc[:, 0].tolist(), model)
    df[f'Y_{model}_probability'] = probabilities
  return df

def predict(data, models, add_probability, batch_size=1000):
  models_res = models.split(",")
  result_dfs = []

  df_test = pd.read_csv(
    StringIO(data.decode('utf-8')),
    skip_blank_lines=False,
    keep_default_na=False,
    na_values=['']
  )
  df_test = df_test.fillna('')
  df_test.iloc[:, 0] = parallel_process_smiles(df_test.iloc[:, 0].tolist())

  for model in models_res:
    model_results = []
    for j in range(0, len(df_test), batch_size):
      batch_df = df_test.iloc[j:j + batch_size]
      result_df = predict_for_model(model, batch_df, add_probability)
      model_results.append(result_df)
    model_result_df = pd.concat(model_results, axis=0, ignore_index=True)
    result_dfs.append(model_result_df)

  final_df = pd.concat(result_dfs, axis=1).loc[:, ~pd.concat(result_dfs, axis=1).columns.duplicated()]
  return final_df.to_csv(index=False)

@app.errorhandler(Exception)
def handle_exception(e):
  logging.error(f"Unhandled Exception: {str(e)}")
  response = {
    "success": False,
    "error": str(e),
    "result": None
  }
  return jsonify(response), 500

@app.route('/predict', methods=['POST'])
def admetica_predict():
  try:
    raw_data = request.data
    
    models = request.args.get('models')
    add_probability = request.args.get('probability', 'false') == 'true'
    start = time()
    response_data = predict(raw_data, models, add_probability)
    logging.debug(f'Time required: {time() - start}')
    
    return jsonify({
      "success": True,
      "error": None,
      "result": response_data
    }), 200

  except Exception as e:
    logging.error(f"Error in prediction: {str(e)}")
    return jsonify({
      "success": False,
      "error": str(e),
      "result": None
    }), 500

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=6678, debug=False)