from flask import Flask, request, jsonify
import subprocess
import os
import tempfile
import json
import hashlib
import re
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import logging

logging_level = logging.WARNING
logging.basicConfig(level=logging_level)

app = Flask(__name__)
logging.warning('autodock app started version -- 12 -- ')


def prepare_autogrid_config(folder_path, receptor_basename, autodock_gpf):
    config_path = "{}/{}.gpf".format(folder_path, receptor_basename)
    with open(config_path, "w") as config_file:
        config_file.write(autodock_gpf)
    return config_path


def calculate_hash(data):
    return hashlib.sha256(data.encode()).hexdigest()


def run_process(command, folder_path=None, shell=False):
    command_txt = ' '.join(command) if isinstance(command, list) else str(command)
    logging.warning('run_process: ' + json.dumps({
        'command': command_txt, 'folder_path': folder_path, 'shell': shell
    }, indent=2))
    output_file = 'out.txt'
    error_file = 'err.txt'
    with open(output_file, 'w+') as fout:
        with open(error_file, 'w+') as ferr:
            return_code = subprocess.call(command if not shell else command_txt, stdout=fout, stderr=ferr,
                                          shell=shell, cwd=folder_path)
            fout.seek(0)
            output = fout.read()
            ferr.seek(0)
            error = ferr.read()
            os.remove(output_file)
            os.remove(error_file)
    logging.debug('run_process: output\n' + output)
    logging.debug('run_process: output END\n')

    logging.debug('run_process: error\n' + error)
    logging.debug('run_process: error END\n')

    return return_code, output, error


def run_docking(receptor_name, folder_path, autodock_gpf, ligand_value, ligand_format, ligand_name, pose_count):
    logging.debug('run_docking: ')
    logging.debug('run_docking: ' + 'folder_path: ' + str(folder_path))
    ligand_path = '{}.{}'.format(ligand_name, ligand_format)

    autodock_gpf_path = '{}/{}'.format(folder_path, 'autodock.gpf')
    with open(autodock_gpf_path, 'w') as autodock_gpf_file:
        autodock_gpf_file.write(autodock_gpf)

    with open('{}/{}'.format(folder_path, ligand_path), 'w') as ligand_file:
        ligand_file.write(ligand_value)

    if 'pdbqt' not in ligand_format:
        subprocess.call(['prepare_ligand4.py', '-F', '-l', ligand_path], cwd=folder_path)

    autodock_command = [
        '/opt/autodock-gpu',
        '--ffile', '{}.maps.fld'.format(receptor_name),
        '--lfile', '{}.pdbqt'.format(ligand_name),
        '--nrun', str(pose_count),
        '--resnam', '{}-{}'.format(receptor_name, ligand_name)
    ]
    return run_process(autodock_command, folder_path, False)


def prepare_grids(folder_path, receptor_path, receptor_name, receptor_value, autodock_gpf):
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)

        with open('{}/{}'.format(folder_path, receptor_path), 'w') as receptor_file:
            receptor_file.write(receptor_value)

        if 'pdbqt' not in receptor_path:
            subprocess.call(['prepare_receptor4.py', '-r', receptor_path], cwd=folder_path)

        autogrid_config_path = prepare_autogrid_config(folder_path, receptor_name, autodock_gpf)
        subprocess.call(['/usr/local/x86_64Linux2/autogrid4',
                         '-p', autogrid_config_path,
                         '-l', "{}.autogrid.log".format(receptor_name)
                         ], cwd=folder_path)


# Use full path for dlg_path and out_path
def convert_dlg_to_pdbqt(dlg_path, out_path):
    if not os.path.isfile(dlg_path):
        raise Exception('File not found ' + dlg_path)
    logging.warning('convert_dlg_to_pdbqt: ' + json.dumps({'dlg_path': dlg_path, 'out_path': out_path}, indent=2))
    if logging_level <= logging.DEBUG:
        with open(dlg_path, 'r') as dlg_file:
            dlg = dlg_file.read()
            logging.debug('convert_dlg_to_pdbqt: dlg content\n' + dlg)
    convert_command = [
        'cat', dlg_path,
        '|', 'grep', '"^DOCKED: "',
        '|', 'cut', '-b', '9-', '>', out_path
    ]
    res = run_process(convert_command, shell=True)
    if logging_level <= logging.DEBUG:
        with open(out_path, 'r') as out_file:
            out = out_file.read()
            logging.debug('convert_dlg_to_pdbqt: out content\n' + dlg)
    return res


def get_receptor_name(autodock_gpf):
    pattern = r"receptor\s+(\S+\.pdbqt)"
    match = re.search(pattern, autodock_gpf)
    return match.group(1)[:-6] if match else None


def process_ligand(i, receptor_name, folder_path, autodock_gpf, ligand_data, ligand_format, pose_count):
    ligand_name = 'ligand{}'.format(i + 1)
    docking_return_code, gpu_output, gpu_error = run_docking(receptor_name, folder_path, autodock_gpf, ligand_data,
                                                             ligand_format, ligand_name, pose_count)

    if docking_return_code != 0:
        return i, {'error': gpu_output if gpu_output != '' else gpu_error}

    dlg_path = os.path.join(folder_path, '{}-{}.dlg'.format(receptor_name, ligand_name))
    result_path = os.path.join(folder_path, '{}-{}.pdbqt'.format(receptor_name, ligand_name))
    grep_return_code, grep_output, grep_error = convert_dlg_to_pdbqt(dlg_path, result_path)
    if grep_return_code != 0:
        return i, {'error': grep_output if grep_output != '' else grep_error}

    with open(result_path, 'r') as result_file:
        result_content = result_file.read()

    return i, {'poses': result_content}


def extract_json_values(json_data):
    receptor_value = json_data.get('receptor', '')
    receptor_format = json_data.get('receptor_format', '')
    ligand_value = json_data.get('ligand', '')
    ligand_format = json_data.get('ligand_format', '')
    autodock_gpf = json_data.get('autodock_gpf', '')
    pose_count = json_data.get('pose_count', 30)
    debug_mode = request.args.get('debug', False)

    return receptor_value, receptor_format, ligand_value, ligand_format, autodock_gpf, pose_count, debug_mode


@app.route('/check_opencl', methods=['GET'])
def check_opencl():
    try:
        command = ['clinfo']
        process = subprocess.Popen(command, stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        output, _ = process.communicate()
        if process.returncode == 0:
            return jsonify({'success': True, 'output': output})
        else:
            return jsonify({'success': False, 'error': 'clinfo execution failed'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/autodock/dock_ligand', methods=['POST'])
def dock_ligand():
    raw_data = request.data
    json_data = json.loads(raw_data)

    receptor_value, receptor_format, ligand_value, ligand_format, autodock_gpf, pose_count, debug_mode = \
        extract_json_values(json_data)

    folder_name = calculate_hash(receptor_value + autodock_gpf)
    folder_path = os.path.join(os.getcwd(), folder_name)

    receptor_name = get_receptor_name(autodock_gpf)
    ligand_name = 'ligand'

    receptor_path = '{}.{}'.format(receptor_name, receptor_format)

    prepare_grids(folder_path, receptor_path, receptor_name, receptor_value, autodock_gpf)
    return_code, gpu_output, gpu_error = run_docking(receptor_name, folder_path, autodock_gpf, ligand_value,
                                                     ligand_format, ligand_name, pose_count)

    if return_code != 0:
        error = gpu_output if gpu_output != '' else gpu_error
        response = {
            'error': error
        }
        return jsonify(response)

    dlg_path = os.path.join(folder_path, '{}-{}.dlg'.format(receptor_name, ligand_name))
    result_path = os.path.join(folder_path, '{}-{}.pdbqt'.format(receptor_name, ligand_name))
    grep_return_code, grep_output, grep_error = convert_dlg_to_pdbqt(dlg_path, result_path)
    if grep_return_code != 0:
        error = grep_output if grep_output != '' else grep_error
        response = {
            'error': error
        }
        return jsonify(response)

    with open(result_path, 'r') as result_file:
        result_content = result_file.read()

    response = {
        'poses': result_content
    }

    if debug_mode:
        response['debug_info'] = {
            'gpu_output': gpu_output,
            'gpu_error': gpu_error,
            'grep_output': grep_output,
            'grep_error': grep_error
        }

    return jsonify(response)


@app.route('/autodock/dock_ligand_list', methods=['POST'])
def dock_list_ligands():
    raw_data = request.data
    json_data = json.loads(raw_data)

    receptor_value, receptor_format, ligand_value, ligand_format, autodock_gpf, pose_count, debug_mode = extract_json_values(
        json_data)

    folder_name = calculate_hash(receptor_value + autodock_gpf)
    folder_path = os.path.join(os.getcwd(), folder_name)

    receptor_name = get_receptor_name(autodock_gpf)
    receptor_path = '{}.{}'.format(receptor_name, receptor_format)
    prepare_grids(folder_path, receptor_path, receptor_name, receptor_value, autodock_gpf)
    result_poses = {}

    with ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(process_ligand, i, receptor_name, folder_path, autodock_gpf, ligand_data, ligand_format)
            for i, ligand_data in enumerate(ligand_value)]

        for future in concurrent.futures.as_completed(futures):
            i, result = future.result()
            result_poses[i] = result

    response = {'ligand_results': result_poses}
    return jsonify(response)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, threaded=True)
