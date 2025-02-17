from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import torch
import os
import logging
import tempfile
import re
import json
import pandas as pd
import shutil

app = Flask(__name__)
CORS(app)

logging.basicConfig(
  level=logging.DEBUG,
  format="%(asctime)s - %(levelname)s - %(message)s",
  handlers=[
    logging.StreamHandler(),
    logging.FileHandler("app.log")
  ]
)

@app.route('/predict', methods=['POST'])
def predict():
  """
  Endpoint to run the Boltz prediction command and capture real-time logs.
  """
  try:
    yaml_content = request.json.get('yaml')
    msa_content = request.json.get('msa')

    if not yaml_content:
      return jsonify({"error": "YAML content is required."}), 400

    output_dir = os.getcwd()
    yaml_file_path = os.path.join(output_dir, "input.yaml")
    msa_file_path = os.path.join(output_dir, "input.a3m")

    with open(yaml_file_path, mode='w') as yaml_file:
      yaml_file.write(yaml_content)

    if msa_content:
      with open(msa_file_path, mode='w') as msa_file:
        msa_file.write(msa_content)

      with open(yaml_file_path, 'r') as file:
        yaml_content = file.read()

      yaml_content = re.sub(r"msa:\s*[\w\.-]+", f"msa: {os.path.basename(msa_file_path)}", yaml_content)

      with open(yaml_file_path, 'w') as file:
        file.write(yaml_content)

    if torch.cuda.is_available():
      accelerator = "gpu"
      logging.info("GPU is available. Using GPU for acceleration.")
    else:
      accelerator = "cpu"
      logging.info("No GPU available. Falling back to CPU.")
    
    command = [
      "boltz",
      "predict",
      yaml_file_path,
      "--accelerator", accelerator,
      "--output_format", "pdb",
      "--override",
    ]
        
    if not msa_content:
      command.append("--use_msa_server")

    logging.info(f"Running command: {' '.join(command)}")

    process = subprocess.Popen(
      command,
      stdout=subprocess.PIPE,
      stderr=subprocess.PIPE,
      text=True
    )

    for line in process.stdout:
      logging.info(line.strip())

    process.wait()

    if process.returncode == 0:
      yaml_file_name = os.path.splitext(os.path.basename(yaml_file_path))[0]
      for root, dirs, files in os.walk("."):
        if "results" in root:
          predictions_folder = os.path.join(root, "predictions", yaml_file_name)
          if os.path.exists(predictions_folder):
            pdb_files = [f for f in os.listdir(predictions_folder) if f.endswith(".pdb")]
            confidence_file_name = f"confidence_{yaml_file_name}_model_0.json"
            confidence_file_path = os.path.join(predictions_folder, confidence_file_name)
            if pdb_files:
              pdb_file_path = os.path.join(predictions_folder, pdb_files[0])
              with open(pdb_file_path, 'r') as pdb_file:
                pdb_content = pdb_file.read()

              confidence_score = None
              if os.path.exists(confidence_file_path):
                with open(confidence_file_path, 'r') as confidence_file:
                  confidence_data = json.load(confidence_file)
                  confidence_score = confidence_data.get("confidence_score", None)
              
              remark_lines = [
                f"REMARK   1 {key:<20} {value:.3f}\n"
                for key, value in confidence_data.items()
                if isinstance(value, (int, float))
              ]
              
              pdb_content_str = "\n".join(remark_lines) + pdb_content
              
              df = pd.DataFrame([{"pdb": pdb_content_str, "confidence_score": confidence_score}])
              csv_string = df.to_csv(index=False)

              shutil.rmtree(f"boltz_results_{yaml_file_name}")

              return jsonify({
                "success": True,
                "result": csv_string
              }), 200
      return jsonify({"success": False, "error": "PDB file not found in predictions folder."}), 500
    else:
      return jsonify({"success": False, "error": "Prediction failed."}), 500
  except Exception as e:
    logging.error(f"Unexpected error: {str(e)}")
    return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
  app.run(host='0.0.0.0', port=8888)