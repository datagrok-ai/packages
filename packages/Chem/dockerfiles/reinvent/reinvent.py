from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import subprocess
import os
import sys
import logging
import json
import shutil
import toml
import zipfile

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

@app.route('/run_reinvent', methods=['POST'])
def run_reinvent():
    """
    Endpoint to run the REINVENT process and return processed results.
    """
    try:
        file = request.files.get('folder')
        if file:
            file_path = os.path.join(file.filename)
            file.save(file_path)

        # Extract the zip file to the specified folder
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall()

        logging.debug(f'Zip file saved and extracted at: {file_path}')

        smiles_list = request.form.getlist('smiles')
        logging.debug(f'smiles list: {smiles_list}')

        output_csv = "stage1_1.csv"

        if not smiles_list:
            return {"error": "Missing required inputs: 'smiles'"}, 400
        
        # Write SMILES to .smi file
        smiles_filename = "smiles.smi"
        with open(smiles_filename, "w") as smiles_file:
            smiles_file.write("\n".join(smiles_list))
        logging.info("SMILES file written: %s", smiles_filename)

        logging.info("Starting the REINVENT process...")
        current_directory = os.getcwd()

        with open("config.toml", "r") as file:
            config_dict = toml.load(file)
        
        model_folder_map = {}

        files = [f for f in os.listdir(current_directory) if os.path.isfile(os.path.join(current_directory, f))]
        pt_files = [f for f in files if f.endswith('.pt')]
        logging.info("Pytorch models: %s", ', '.join(pt_files))
        for pt_file in pt_files:
            folder_name = os.path.splitext(pt_file)[0]
            folder_path = os.path.join(current_directory, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            shutil.move(os.path.join(current_directory, pt_file), os.path.join(folder_path, pt_file))
            # Store the mapping from model name to folder path
            model_folder_map[folder_name] = folder_path
        
        # Update checkpoint dirs for models
        for component in config_dict["stage"][0]["scoring"]["component"]:
            if "ChemProp" in component:
                for endpoint in component["ChemProp"]["endpoint"]:
                    model_name = endpoint["name"]
                    if model_name in model_folder_map:
                        endpoint["params"]["checkpoint_dir"] = f'{model_folder_map[model_name]}/'
        
        # Update the prior_file and agent_file by adding the current directory
        config_dict["parameters"]["prior_file"] = f"/{current_directory}/REINVENT4/priors/{config_dict['parameters']['prior_file']}"
        config_dict["parameters"]["agent_file"] = f"/{current_directory}/REINVENT4/priors/{config_dict['parameters']['agent_file']}"

        # Update smiles_file
        config_dict["parameters"]["smiles_file"] = f"/{current_directory}/{smiles_filename}"
        python_path = sys.executable

        # Iterate through the stage -> scoring -> component -> DockStream to update the paths
        for component in config_dict["stage"][0]["scoring"]["component"]:
            if "DockStream" in component:
                for endpoint in component["DockStream"]["endpoint"]:
                    endpoint["params"]["configuration_path"] = f"/{current_directory}/kras_docking.json"
                    endpoint["params"]["docker_script_path"] = f"/{current_directory}/DockStream/docker.py"
                    endpoint["params"]["docker_python_path"] = "/opt/conda/envs/DockStream/bin/python"

        # Write configuration to a TOML file
        toml_config_filename = "stage1.toml"
        with open(toml_config_filename, "w") as tf:
            config = toml.dumps(config_dict)
            logging.debug("Generated configuration: %s", config)
            tf.write(config)
        logging.info("Configuration written to %s", toml_config_filename)

        reinvent_help_command = "reinvent --help"
        logging.info("Running REINVENT help command: %s", reinvent_help_command)
        help_result = subprocess.run(reinvent_help_command, shell=True, capture_output=True, text=True)
        
        # Log the output and error (if any) from the help command
        logging.debug("REINVENT help command output: %s", help_result.stdout)
        if help_result.stderr:
            logging.error("REINVENT help command error: %s", help_result.stderr)

        # Run the REINVENT command
        reinvent_command = "reinvent -l stage1.log stage1.toml"
        logging.info("Running REINVENT command: %s", reinvent_command)
        result = subprocess.run(reinvent_command, shell=True, check=True, capture_output=True, text=True)
        logging.debug("REINVENT command output: %s", result.stdout)
        logging.debug("REINVENT command error (if any): %s", result.stderr)

        # Read and process the output CSV
        logging.info("Reading output CSV: %s", output_csv)
        df = pd.read_csv(output_csv)
        df = df.drop_duplicates(subset='SMILES')
        return df.to_json(orient='records')

    except subprocess.CalledProcessError as e:
        logging.error("Subprocess failed: %s", e)
        return {"error": "Subprocess failed", "details": str(e)}, 500
    except FileNotFoundError as e:
        logging.error("File not found: %s", e)
        return {"error": "File not found", "details": str(e)}, 404
    except pd.errors.EmptyDataError as e:
        logging.error("CSV file is empty or invalid: %s", e)
        return {"error": "CSV processing failed", "details": str(e)}, 400
    except Exception as e:
        logging.error("An unexpected error occurred: %s", e)
        return {"error": "Unexpected error", "details": str(e)}, 500

if __name__ == '__main__':
    logging.info("Starting Flask app...")
    app.run(host='0.0.0.0', port=6666, threaded=True)