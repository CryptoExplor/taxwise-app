
"use client";
import { useAppContext } from "@/context/app-context";
import { Dashboard } from "@/components/dashboard";
import { ITRUpload } from "@/components/itr-upload";
import { ClientForm } from "@/components/client-form";
import { ComputationDashboard } from "@/components/computation-dashboard";

export default function Home() {
    const { activeTab } = useAppContext();

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'upload':
                return <ITRUpload />;
            case 'manual':
                return <ClientForm />;
            case 'computation':
                return <ComputationDashboard />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div>
            {renderContent()}
        </div>
    );
}
