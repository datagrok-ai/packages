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
import multiprocessing
import signal

logging_level = logging.DEBUG
logging.basicConfig(level=logging_level)

app = Flask(__name__)

processes = {}

def prepare_autogrid_config(folder_path, receptor_basename, autodock_gpf):
    config_path = "{}/{}.gpf".format(folder_path, receptor_basename)
    if isinstance(autodock_gpf, unicode):
        autodock_gpf = autodock_gpf.encode("utf-8")
    with open(config_path, "w") as config_file:
        config_file.write(autodock_gpf)
    return config_path

def calculate_hash(data):
    if isinstance(data, unicode):
        data = data.encode('utf-8')
    return hashlib.sha256(data).hexdigest()


def run_process(command, folder_path, shell=False):
    command_txt = ' '.join(command) if isinstance(command, list) else str(command)
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
            if os.path.exists(output_file):
                os.remove(output_file)
            if os.path.exists(error_file):
                os.remove(error_file)
    
    logging.debug('run_process: output\n{}'.format(output))
    logging.debug('run_process: output END\n')
    
    logging.debug('run_process: error\n{}'.format(error))
    logging.debug('run_process: error END\n')

    if "Error" in output or "Error" in error:
        return_code = 1

    return return_code, output, error

def run_docking(receptor_name, folder_path, autodock_gpf, ligand_value, ligand_format, ligand_name, pose_count):
    logging.debug('run_docking: ')
    logging.debug('run_docking: ' + 'folder_path: ' + str(folder_path))

    ligand_path = '{}.{}'.format(ligand_name, ligand_format)

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
        subprocess_command = [
            '/usr/local/x86_64Linux2/autogrid4',
            '-p', autogrid_config_path,
            '-l', "{}.autogrid.log".format(receptor_name)
        ]
        subprocess.call(subprocess_command, cwd=folder_path)

def convert_dlg_to_pdbqt(folder_path, dlg_path, out_path):
    if logging_level <= logging.DEBUG:
        with open('{}/{}'.format(folder_path, dlg_path), 'r') as dlg_file:
            dlg = dlg_file.read()
            logging.debug('convert_dlg_to_pdbqt: dlg content\n' + dlg)

    convert_command = [
        'cat', dlg_path,
        '|', 'grep', '"^DOCKED: "',
        '|', 'cut', '-b', '9-', '>', out_path
    ]

    res = run_process(convert_command, folder_path, True)
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

    dlg_path = '{}-{}.dlg'.format(receptor_name, ligand_name)
    out_path = '{}-{}.pdbqt'.format(receptor_name, ligand_name)
    grep_return_code, grep_output, grep_error = convert_dlg_to_pdbqt(folder_path, dlg_path, out_path)
    if grep_return_code != 0:
        return i, {'error': grep_output if grep_output != '' else grep_error}

    with open('{}/{}'.format(folder_path, out_path), 'r') as result_file:
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

def dock_ligand_process(request_data, result_queue):
    """
    The function to handle docking logic in a separate process.
    Sends the result to the main process via the result_queue.
    """
    json_data = json.loads(request_data)

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
        result_queue.put({'error': error})
        return

    dlg_path = '{}-{}.dlg'.format(receptor_name, ligand_name)
    out_path = '{}-{}.pdbqt'.format(receptor_name, ligand_name)
    grep_return_code, grep_output, grep_error = convert_dlg_to_pdbqt(folder_path, dlg_path, out_path)
    if grep_return_code != 0:
        error = grep_output if grep_output != '' else grep_error
        result_queue.put({'error': error})
        return

    with open('{}/{}'.format(folder_path, out_path), 'r') as result_file:
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

    result_queue.put(response)

@app.route('/autodock/dock_ligand', methods=['POST'])
def dock_ligand():
    """
    Route to start docking in a separate process and return the result.
    """
    raw_data = request.data
    result_queue = multiprocessing.Queue()

    process = multiprocessing.Process(target=dock_ligand_process, args=(raw_data, result_queue))
    process.start()
    processes[process.pid] = process

    process.join()

    if not result_queue.empty():
        result = result_queue.get()
        return jsonify(result)

    return jsonify({'error': 'Something went wrong during the docking process.'}), 500

@app.route('/autodock/kill_process', methods=['POST'])
def kill_all_processes():
    """
    Route to kill all running docking processes.
    """
    killed_processes = []
    for pid, process in list(processes.items()):
        if process.is_alive():
            os.kill(pid, signal.SIGTERM)
            process.join()
            killed_processes.append(pid)
            del processes[pid]

    if killed_processes:
        return jsonify({'message': 'Processes {} terminated.'.format(killed_processes)})
    else:
        return jsonify({'message': 'No running processes found.'}), 200

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
            executor.submit(process_ligand, i, receptor_name, folder_path, autodock_gpf, ligand_data, ligand_format, pose_count)
            for i, ligand_data in enumerate(ligand_value)]

        for future in concurrent.futures.as_completed(futures):
            i, result = future.result()
            result_poses[i] = result

    response = {'ligand_results': result_poses}
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, threaded=True)
