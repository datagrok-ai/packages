from flask import Flask, request, jsonify
import subprocess
import logging
import os
import base64
import zipfile
import io
import csv

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Configuration
LIGAND_FILE_PREFIX = 'temp_ligand'
RECEPTOR_FILE_PREFIX = 'temp_receptor'
DOCKING_OUTPUT_PREFIX = 'temp_redocking'

def save_base64_folder(encoded_content):
    try:
        decoded_content = base64.b64decode(encoded_content)
        zip_ref = zipfile.ZipFile(io.BytesIO(decoded_content))
        folder_name = zip_ref.namelist()[0].split('/')[0] + '.trg'
        with open(folder_name, 'wb') as file:
            file.write(decoded_content)
        return folder_name
    except Exception as e:
        logger.error('Failed to save base64 folder: %s', str(e))
        raise

def run_subprocess(command):
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()
        stdout = stdout.decode('utf-8')
        stderr = stderr.decode('utf-8')
        logger.debug('stdout: %s', stdout)
        logger.debug('stderr: %s', stderr)
        if process.returncode != 0:
            raise Exception(stderr)
        return stdout, stderr
    except Exception as e:
        logger.error('Subprocess failed: %s', str(e))
        raise

def parse_stdout_to_csv(stdout):
    try:
        lines = stdout.splitlines()
        data = []
        for line in lines:
            if line.startswith('2024-'):
                continue
            parts = line.split()
            if len(parts) >= 7 and parts[0].isdigit():
                data.append(parts)
        
        csv_output = io.BytesIO()
        writer = csv.writer(csv_output)
        writer.writerow(['mode', 'affinity', 'ref.', 'clust.', 'rmsd', 'energy', 'best'])
        writer.writerows(data)
        csv_output.seek(0)
        return csv_output.read().decode('utf-8')
    except Exception as e:
        logger.error('Failed to parse stdout to CSV: %s', str(e))
        raise

def find_and_read_file(prefix):
    try:
        for root, dirs, files in os.walk('.'):
            for file_name in files:
                if prefix in file_name:
                    with open(os.path.join(root, file_name), 'r') as file:
                        return file.read()
        raise Exception('File with prefix {} not found'.format(prefix))
    except Exception as e:
        logger.error('Failed to find and read file: %s', str(e))
        raise

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

def prepare_target(target_folder, receptor_file_name, ligand_file_name):
    command = ['agfr', '-r', receptor_file_name, '-l', ligand_file_name, '-asv', '1.0', '-o', target_folder]
    run_subprocess(command)

def dock(receptor_file_name, target_folder_path, searches, evaluations):
    command = [
        'adcp', '-t', target_folder_path, '-s', 'sscsscplsk', '-N', str(searches), '-n', str(evaluations),
        '-cys', '-o', DOCKING_OUTPUT_PREFIX, '-ref', receptor_file_name, '-nc', '0.8'
    ]
    return run_subprocess(command)

@app.route('/adcp/dock', methods=['POST'])
def dock_endpoint():
    try:
        logger.info('Received request for docking process')
        data = request.get_json()

        required_keys = {'ligand', 'receptor', 'target', 'searches', 'evaluations'}
        if not required_keys.issubset(data):
            logger.debug('Missing required data keys in request')
            return jsonify({'error': 'Ligand, receptor, target, searches, and evaluations data must be provided'}), 400

        ligand_content = data['ligand']
        receptor_content = data['receptor']
        ligand_format = data.get('ligand_format', 'pdb')
        receptor_format = data.get('receptor_format', 'pdb')
        target = data['target']
        searches = data['searches']
        evaluations = data['evaluations']

        # Save target folder
        target_folder = save_base64_folder(target)

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

        # Prepare target
        # prepare_target(target_folder, receptor_file_name, ligand_file_name)

        # Perform docking
        stdout, stderr = dock(receptor_file_name, target_folder, searches, evaluations)

        # Parse stdout to CSV
        csv_output = parse_stdout_to_csv(stdout)

        logger.debug('csv output')
        logger.debug(csv_output)

        # Find and read best docking result file
        best_file_content = find_and_read_file(DOCKING_OUTPUT_PREFIX + '_best')
        logger.debug('best file content')
        logger.debug(best_file_content)

        # Cleanup
        os.remove(ligand_file_name)
        os.remove(receptor_file_name)

        return jsonify({'csv_output': csv_output, 'best_file_content': best_file_content}), 200

    except Exception as e:
        logger.error('An error occurred: %s', str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)