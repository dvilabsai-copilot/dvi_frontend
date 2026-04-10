import { useEffect, useState } from "react";
import axios from "axios";

interface Subscription {
  id: number;
  planName: string;
  amount: number;
  startDate: string;
  endDate: string;
}

export default function SubscriptionHistory() {

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {

      const res = await axios.get(
        "http://localhost:3000/agent-subscription-plan/agent/history"
      );

      setSubscriptions(res.data);

    } catch (error) {
      console.error("Error loading subscription history:", error);
    }
  };

  return (
    <div>

      <h2>Subscription History</h2>

      <table border={1}>

        <thead>
          <tr>
            <th>Plan</th>
            <th>Amount</th>
            <th>Start Date</th>
            <th>End Date</th>
          </tr>
        </thead>

        <tbody>

          {subscriptions.map((sub) => (

            <tr key={sub.id}>
              <td>{sub.planName}</td>
              <td>₹ {sub.amount}</td>
              <td>{new Date(sub.startDate).toLocaleDateString()}</td>
              <td>{new Date(sub.endDate).toLocaleDateString()}</td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}