from flask import Flask, request, jsonify
import subprocess
import logging
import os
import json
import base64
import zipfile

app = Flask(__name__)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# May be needed in case we decide users won't generate target files on its own
def prepare_target_file(receptor_file_name, ligand_file_name):
    process = subprocess.Popen(
        ['agfr', '-r', receptor_file_name, '-l', ligand_file_name, '-o', '5GRD'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    stdout, stderr = process.communicate()
    logger.debug('stdout: %s', stdout)
    logger.debug('stderr: %s', stderr)

    if process.returncode != 0:
        error_message = stderr.decode('utf-8')
        logger.debug('Making target file failed: %s', error_message)
        return jsonify({'error': 'Docking process failed', 'details': error_message}), 500

@app.route('/adcp/dock', methods=['POST'])
def dock():
    try:
        logger.info('Received request for docking process')
        
        data = request.get_json()

        if 'ligand' not in data or 'receptor' not in data:
            logger.debug('Ligand or receptor data missing from request')
            return jsonify({'error': 'Ligand and receptor data must be provided'}), 400

        ligand_content = data['ligand']
        receptor_content = data['receptor']
        ligand_format = data.get('ligand_format', 'pdb')
        receptor_format = data.get('receptor_format', 'pdb')
        target = base64.b64decode(data['target'])

        target_file_path = 'temp_target.trg'
        with open(target_file_path, 'wb') as target_file:
            target_file.write(target)

        ligand_file_name = 'temp_ligand.' + ligand_format
        receptor_file_name = 'temp_receptor.' + receptor_format

        with open(ligand_file_name, 'w') as ligand_file:
            ligand_file.write(ligand_content)
        with open(receptor_file_name, 'w') as receptor_file:
            receptor_file.write(receptor_content)

        if ligand_format == 'pdb':
            ligand_preparation_command = ['prepare_ligand', '-l', ligand_file_name]
            subprocess.check_call(ligand_preparation_command)
            ligand_file_name = 'temp_ligand.pdbqt'  # Update to the new file name if needed

        if receptor_format == 'pdb':
            receptor_preparation_command = ['prepare_receptor', '-r', receptor_file_name]
            subprocess.check_call(receptor_preparation_command)
            receptor_file_name = 'temp_receptor.pdbqt'  # Update to the new file name if needed
 
        docking_process = subprocess.Popen(
            ['adcp', '-t', , '-s', 'npisdvd', '-N', '20', '-n', '1000000', '-o', '3Q47_redocking', '-ref', receptor_file_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        stdout, stderr = docking_process.communicate()
        logger.debug('stdout: %s', stdout)
        logger.debug('stderr: %s', stderr)

        logger.debug('Docking process completed successfully')

        os.remove(ligand_file_name)
        os.remove(receptor_file_name)

        return jsonify({'result': 'everything is fine'}), 200

    except Exception as e:
        logger.debug('An error occurred: %s', str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)