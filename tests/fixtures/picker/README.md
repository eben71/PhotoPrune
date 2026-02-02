## Command to run the fixture test

Run the following command in BASH terminal for each file in /tests/fixtures/picker

curl -s -X POST http://localhost:8000/api/scan \
 -H "Content-Type: application/json" \
 --data @tests/fixtures/picker/exact_dupes.picker.json \
 | tee tests/fixtures/results/exact_dupes.result.json
