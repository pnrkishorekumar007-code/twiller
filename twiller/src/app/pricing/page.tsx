import PricingPlans from "@/components/PricingPlans";
import Mainlayout from "@/components/layout/Mainlayout";
import { AuthProvider } from "@/context/AuthContext";

export default function PricingPage() {
  return (
    <AuthProvider>
      <Mainlayout>
        <PricingPlans />
      </Mainlayout>
    </AuthProvider>
  );
}
