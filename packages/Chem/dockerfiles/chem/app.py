from flask import Blueprint, Flask, request, Response
from chem import *
import logging
import sys
import json
import gzip
import os

from utils import parallelize
from settings import Settings

app = Flask('descriptors')
handler = logging.StreamHandler(sys.stderr)
handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
app.logger.handlers.clear()
app.logger.addHandler(handler)
app.logger.setLevel(logging.DEBUG)
bp = Blueprint('descriptors', __name__)

headers_text = {'Content-Type': 'text/plain'}
headers_app_json = {'Content-Type': 'application/json'}
headers_app_octet_stream = {'Content-Type': 'application/octet-stream'}
Settings.init()


@bp.route('/chem/descriptors/tree', methods=['GET'])
def chem_descriptors_tree():
    content = json.dumps(get_descriptors_tree())
    headers = dict(headers_app_json)
    headers['Cache-Control'] = 'max-age=31536000'
    return _make_response(content, headers=headers)


@bp.route('/chem/descriptors', methods=['POST'])
def chem_descriptors():
    app.logger.debug("Started descriptors calculation")
    data = json.loads(request.data)
    molecules = data[request.args.get('molKey', 'molecules')]
    result = parallelize(get_descriptors, [molecules, data[request.args.get('desc', 'descriptors')]], [molecules],
                         Settings.num_cores)
    app.logger.debug("Finished descriptors calculation")
    return _make_response(json.dumps(result), headers=headers_app_json)


@bp.route('/chem/molecules_to_canonical', methods=['POST'])
def chem_molecules_to_canonical():
    molecules = json.loads(request.data)
    result = parallelize(molecules_to_canonical, [molecules], [molecules], Settings.num_cores)
    return _make_response(json.dumps(result), headers=headers_app_json)


@bp.route('/chem/molecules_to_inchi', methods=['POST'])
def chem_molecules_to_inchi():
    molecules = json.loads(request.data)
    result = parallelize(molecules_to_inchi, [molecules], [molecules], Settings.num_cores)
    return _make_response(json.dumps(result), headers=headers_app_json)


@bp.route('/chem/molecules_to_inchi_key', methods=['POST'])
def chem_molecules_to_inchi_key():
    molecules = json.loads(request.data)
    result = parallelize(molecules_to_inchi_key, [molecules], [molecules], Settings.num_cores)
    return _make_response(json.dumps(result), headers=headers_app_json)


@bp.route('/chem/inchi_to_inchi_key', methods=['POST'])
def chem_inchi_to_inchi_key():
    inchi = json.loads(request.data)
    result = parallelize(inchi_to_inchi_key, [inchi], [inchi], Settings.num_cores)
    return _make_response(json.dumps(result), headers=headers_app_json)


@bp.route('/chem/inchi_to_smiles', methods=['POST'])
def chem_inchi_to_smiles():
    inchi = json.loads(request.data)
    result = parallelize(inchi_to_smiles, [inchi], [inchi], Settings.num_cores)
    return _make_response(json.dumps(result), headers=headers_app_json)

def _make_response(data, headers=None):
    response = Response(data)
    response.headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,GET,DELETE,PUT,OPTIONS'
    }
    if headers is not None:
        response.headers.update(headers)
    return response


def make_compressed_response(response):
    accept_encoding = request.headers.get('Accept-Encoding', '').lower()
    if (response.status_code < 200 or response.status_code >= 300 or response.direct_passthrough or
            'gzip' not in accept_encoding or 'Content-Encoding' in response.headers):
        return response
    data = response.get_data()
    length = len(data)
    compress_level = 6 if 100_000 < length < 10_000_000 else 1 if length <= 100_000 else 9
    app.logger.debug(f"Compression of response with compress level of {compress_level}...")
    content = gzip.compress(data, compresslevel=compress_level)
    app.logger.debug(f"Compression finished. Length before - {length}, after - {len(content)}")
    response.set_data(content)
    response.headers['Content-Length'] = len(content)
    response.headers['Content-Encoding'] = 'gzip'
    return response


def decompress_request():
    if 'gzip' in request.headers.get('Content-Encoding', ''):
        data = request.get_data()
        expected_length = int(request.headers.get('Content-Length', '-1'))
        if expected_length != len(data):
            return Response(f'Content length differs. Expected length {expected_length}, received {len(data)}',
                            status=400)
        app.logger.debug("Decompression of request body...")
        data = gzip.decompress(data)
        app.logger.debug("Decompressed request body")
        request.data = data


app.register_blueprint(bp)
app.before_request(decompress_request)
app.after_request(make_compressed_response)


if __name__ == '__main__':
    app.run(host=Settings.host, port=Settings.port, threaded=True)
