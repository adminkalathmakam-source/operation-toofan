# FastAPI demo API

Install dependencies from `requirements.txt`, then run `uvicorn app.main:app --reload` from this folder.
Run the API unit checks with `python -m unittest discover -s tests`.

All data is for synthetic demonstration only. The API does not connect to financial institutions or police databases and does not provide legal determinations. Trace results are heuristic patterns for human review. Generated PDFs are draft training artifacts, not court-ready legal documents.

`POST /api/trace-mule` accepts:

```json
{"transactions":[{"sender":"STUDENT-DEMO","receiver":"PROVIDER-ALT-DEMO","amount":35,"channel":"upi","event_type":"upi_payment","reference_id":"SYNTHETIC-01"}]}
```

or `{"csv_data":"sender,receiver,amount,channel,is_p2m\n..."}`. Responses include candidate source-to-sink paths, but sequence/amount coincidence does not establish beneficial ownership or prove that cash later deposited is the cash observed in an earlier event.

An optional `merchant_observations` array compares synthetic usual-vs-observed daily receipts. The demonstration rule flags a value at least 4x its positive baseline and at least INR 500 higher (so INR 200 to INR 900 is flagged). This arbitrary demo threshold is not a validated control or indication of crime; the alert only describes receipt variance and must not be used to target real businesses or people.

`POST /api/generate-remand-memo` accepts evidence metadata, an officer label, checklist booleans, and optional coordinates. It does not accept or store image content.
