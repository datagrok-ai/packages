from flask import Flask, request, jsonify
import subprocess
import logging
import os
import base64
import zipfile

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configuration
TARGET_FILE_PATH = 'temp_target.trg'
LIGAND_FILE_PREFIX = 'temp_ligand'
RECEPTOR_FILE_PREFIX = 'temp_receptor'
DOCKING_OUTPUT = 'temp_redocking'

def save_base64_file(encoded_content, file_path):
    decoded_content = base64.b64decode(encoded_content)
    with open(file_path, 'wb') as file:
        file.write(decoded_content)
    return file_path

def run_subprocess(command):
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate()
    logger.debug('stdout: %s', stdout)
    logger.debug('stderr: %s', stderr)
    if process.returncode != 0:
        error_message = stderr.decode('utf-8')
        logger.error('Subprocess failed: %s', error_message)
        raise Exception('Error during subprocess execution: {}'.format(error_message))
    return stdout, stderr

def prepare_ligand(ligand_file_name, ligand_format):
    if ligand_format == 'pdb':
        command = ['prepare_ligand', '-l', ligand_file_name]
        run_subprocess(command)
        return ligand_file_name.replace('.pdb', '.pdbqt')
    return ligand_file_name

def prepare_receptor(receptor_file_name, receptor_format):
    if receptor_format == 'pdb':
        command = ['prepare_receptor', '-r', receptor_file_name]
        run_subprocess(command)
        return receptor_file_name.replace('.pdb', '.pdbqt')
    return receptor_file_name

def dock(receptor_file_name, target_file_path):
    command = [
        'adcp', '-t', target_file_path, '-s', 'npisdvd', '-N', '20', 
        '-n', '1000000', '-o', DOCKING_OUTPUT, '-ref', receptor_file_name
    ]
    run_subprocess(command)

@app.route('/adcp/dock', methods=['POST'])
def dock_endpoint():
    try:
        logger.info('Received request for docking process')
        
        data = request.get_json()

        if not all(k in data for k in ('ligand', 'receptor', 'target')):
            logger.debug('Ligand, receptor, or target data missing from request')
            return jsonify({'error': 'Ligand, receptor, and target data must be provided'}), 400

        ligand_content = data['ligand']
        receptor_content = data['receptor']
        ligand_format = data.get('ligand_format', 'pdb')
        receptor_format = data.get('receptor_format', 'pdb')
        target = data['target']

        # Save target file
        save_base64_file(target, TARGET_FILE_PATH)

        # Save ligand and receptor files
        ligand_file_name = "{}.{}".format(LIGAND_FILE_PREFIX, ligand_format)
        receptor_file_name = "{}.{}".format(RECEPTOR_FILE_PREFIX, receptor_format)
        with open(ligand_file_name, 'w') as ligand_file:
            ligand_file.write(ligand_content)
        with open(receptor_file_name, 'w') as receptor_file:
            receptor_file.write(receptor_content)

        # Prepare ligand and receptor
        ligand_file_name = prepare_ligand(ligand_file_name, ligand_format)
        receptor_file_name = prepare_receptor(receptor_file_name, receptor_format)

        # Perform docking
        dock(receptor_file_name, TARGET_FILE_PATH)

        # Cleanup
        os.remove(ligand_file_name)
        os.remove(receptor_file_name)
        os.remove(TARGET_FILE_PATH)

        return jsonify({'result': 'Docking process completed successfully'}), 200

    except Exception as e:
        logger.error('An error occurred: %s', str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)