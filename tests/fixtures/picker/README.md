## Command to run the fixture test

Run the fixture helper server in a separate terminal:

make fixture-server

Ensure your .env includes:

SCAN_DOWNLOAD_HOST_OVERRIDES=example.test:http://127.0.0.1:8001

Then run the following command in a BASH terminal for each file in /tests/fixtures/picker

curl -s -X POST http://localhost:8000/api/scan \
 -H "Content-Type: application/json" \
 --data @tests/fixtures/picker/exact_dupes.picker.json \
 | tee tests/fixtures/results/exact_dupes.result.json
