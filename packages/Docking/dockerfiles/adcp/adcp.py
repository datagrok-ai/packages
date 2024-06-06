from flask import Flask, request, jsonify
import subprocess
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route('/dock', methods=['GET'])
def dock():
    try:
        logger.info('Received request for docking process')

        # Run the agfr command to generate target file
        process = subprocess.Popen(
            ['/opt/adfrsuite/bin/agfr', '-r', '5GRD_recH.pdbqt', '-l', '5GRD_pepH.pdbqt', '-o', '5GRD'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            error_message = stderr.decode()
            logger.debug('Docking process failed: {}'.format(error_message))
            return jsonify({'error': 'Docking process failed', 'details': error_message}), 500

        logger.debug('Docking process completed successfully')
        return jsonify({'result': output_content}), 200

    except Exception as e:
        logger.debug('An error occurred: {}'.format(str(e)))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)