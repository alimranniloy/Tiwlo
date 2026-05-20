import { ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export default function SecurityAuditContent() {
  return (
    <div className="space-y-10">
      <h2 className="text-3xl font-black text-[#2e3d49]">Advanced Security Audit</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Compliance and visibility are paramount. Tiwlo’s Security Audit log offers immutable, time-stamped records of every action performed on your account, enabling comprehensive forensic analysis and institutional accountability.
      </p>
      
      <div className="border border-gray-200 p-0 overflow-hidden">
        <table className="w-full text-xs font-mono">
            <tbody>
                <tr className="bg-gray-100"><td className="p-3">Timestamp</td><td className="p-3">Action</td><td className="p-3">User</td></tr>
                <tr><td className="p-3 border-t">10:02:11 UTC</td><td className="p-3 border-t">DELETE_DB</td><td className="p-3 border-t">admin@company</td></tr>
                <tr><td className="p-3 border-t">09:44:03 UTC</td><td className="p-3 border-t">CREATE_DROPLET</td><td className="p-3 border-t">user@company</td></tr>
            </tbody>
        </table>
      </div>
    </div>
  );
}
