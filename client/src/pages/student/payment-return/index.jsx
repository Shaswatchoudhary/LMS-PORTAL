import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import "react-toastify/dist/ReactToastify.css";

const PaypalPaymentReturnPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { search } = location;
  const params = new URLSearchParams(search);

  useEffect(() => {
    const orderId = params.get("order_id");
    const paymentId = params.get("paymentId");
    const payerId = params.get("PayerID");

    if (!orderId || !paymentId || !payerId) {
      toast.error("Payment information not found");
      navigate("/courses");
      return;
    }

   const capturePayment = async () => {
     try {
       const response = await axios.post(`http://localhost:5011/student/order/capture`, {
         orderId,
         paymentId,
         payerId
       });

        if (response.data.success) {
          toast.success("Payment successful!");
          navigate("/student-courses");
        } else {
          toast.error(response.data.message || "Payment failed");
          navigate("/courses");
        }
      } catch (error) {
        console.error("Error capturing payment:", error);
        toast.error("Error processing payment");
        navigate("/courses");
      }
    };

    capturePayment();
  }, [navigate, location.search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Payment...</CardTitle>
      </CardHeader>
    </Card>
  );
};

export default PaypalPaymentReturnPage;
