import asyncio
import unittest

from app.main import (
    Evidence,
    MemoRequest,
    TraceRequest,
    Transaction,
    generate_remand_memo,
    trace_mule,
)


class TraceTests(unittest.TestCase):
    def test_trace_marks_convergence_and_excludes_p2m(self):
        response = asyncio.run(
            trace_mule(
                TraceRequest(
                    transactions=[
                        Transaction(sender="STUDENT-A", receiver="MULE-A", amount=10),
                        Transaction(sender="STUDENT-B", receiver="MULE-A", amount=20),
                        Transaction(
                            sender="SHOP-A",
                            receiver="MULE-A",
                            amount=30,
                            is_p2m=True,
                        ),
                    ]
                )
            )
        )
        self.assertEqual(response["transaction_count"], 3)
        self.assertEqual(response["excluded_p2m_count"], 1)
        self.assertEqual([item["account"] for item in response["candidates"]], ["MULE-A"])
        self.assertEqual(response["candidates"][0]["review_status"], "unverified-pattern")

    def test_csv_input_requires_transaction_columns(self):
        response = asyncio.run(
            trace_mule(
                TraceRequest(
                    csv_data="sender,receiver,amount,is_p2m\nA,B,10,false\nSHOP,MULE,20,true\n"
                )
            )
        )
        self.assertEqual(response["transaction_count"], 2)
        self.assertEqual(response["excluded_p2m_count"], 1)

    def test_graph_returns_synthetic_cash_to_destination_path(self):
        response = asyncio.run(
            trace_mule(
                TraceRequest(
                    transactions=[
                        Transaction(sender="STUDENT-DEMO", receiver="CASH-POOL-DEMO", amount=40, event_type="cash_sale_observation"),
                        Transaction(sender="CASH-POOL-DEMO", receiver="SHOP-ACCOUNT-DEMO", amount=400, event_type="cash_deposit"),
                        Transaction(sender="SHOP-ACCOUNT-DEMO", receiver="ALT-ACCOUNT-DEMO", amount=390),
                        Transaction(sender="ALT-ACCOUNT-DEMO", receiver="PROVIDER-MAIN-DEMO", amount=380),
                    ]
                )
            )
        )
        self.assertIn(
            ["STUDENT-DEMO", "CASH-POOL-DEMO", "SHOP-ACCOUNT-DEMO", "ALT-ACCOUNT-DEMO", "PROVIDER-MAIN-DEMO"],
            response["paths"],
        )
        self.assertEqual(response["edges"][1]["events"][0]["event_type"], "cash_deposit")
        self.assertEqual(
            next(node for node in response["nodes"] if node["id"] == "PROVIDER-MAIN-DEMO")["role"],
            "destination",
        )

    def test_p2m_transaction_is_not_in_graph(self):
        response = asyncio.run(
            trace_mule(
                TraceRequest(
                    transactions=[
                        Transaction(sender="STUDENT-DEMO", receiver="SHOP-DEMO", amount=20, is_p2m=True),
                        Transaction(sender="SHOP-DEMO", receiver="PROVIDER-MAIN-DEMO", amount=500),
                    ]
                )
            )
        )
        self.assertEqual(response["excluded_p2m_count"], 1)
        self.assertNotIn("STUDENT-DEMO", [node["id"] for node in response["nodes"]])

    def test_receipt_anomaly_flags_200_to_900_for_review_only(self):
        response = asyncio.run(
            trace_mule(
                TraceRequest(
                    merchant_observations=[
                        {
                            "merchant_alias": "MERCHANT-DEMO-01",
                            "category": "Bakery",
                            "usual_daily_receipts": 200,
                            "observed_daily_receipts": 900,
                        }
                    ]
                )
            )
        )
        alert = response["merchant_alerts"][0]
        self.assertEqual(alert["status"], "unusual-receipts-review")
        self.assertEqual(alert["multiple_of_baseline"], 4.5)
        self.assertEqual(alert["increase"], 700)
        self.assertIn("demo rule", alert["rule"])

    def test_small_receipt_variance_does_not_trigger_demo_alert(self):
        response = asyncio.run(
            trace_mule(
                TraceRequest(
                    merchant_observations=[
                        {
                            "merchant_alias": "MERCHANT-DEMO-02",
                            "category": "Hotel / restaurant",
                            "usual_daily_receipts": 200,
                            "observed_daily_receipts": 600,
                        }
                    ]
                )
            )
        )
        self.assertEqual(response["merchant_alerts"][0]["status"], "within-demo-rule")

    def test_pdf_is_a_labeled_draft_artifact(self):
        request = MemoRequest(
            case_label="TRAINING-CASE",
            evidence=Evidence(
                sha256="a" * 64,
                captured_at="2026-01-01T00:00:00Z",
                officer_id="DEMO-OFFICER",
                checklist={"demo": True},
            ),
        )
        response = asyncio.run(generate_remand_memo(request))

        async def collect():
            return b"".join([chunk async for chunk in response.body_iterator])

        body = asyncio.run(collect())
        self.assertEqual(response.media_type, "application/pdf")
        self.assertTrue(body.startswith(b"%PDF"))
        self.assertGreater(len(body), 500)


if __name__ == "__main__":
    unittest.main()
