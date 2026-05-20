export default function LoginContent() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-black text-[#2e3d49]">Accessing Your Tiwlo Account</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">
        Securing your account is the first step to deploying infrastructure. Access the portal using your credentials via our secure sign-in page available on the official tiwlo.com domain.
      </p>
      <div className="border border-gray-200 p-8">
        <h4 className="font-bold text-[#2e3d49] text-sm mb-4 uppercase tracking-widest">Login Procedure</h4>
        <ol className="list-decimal pl-5 text-sm text-[#4a4a4a] space-y-4">
          <li>Navigate to <code className="bg-gray-100 px-1 py-0.5">tiwlo.com/login</code> - ensure your browser shows the secure connection padlock.</li>
          <li>Enter your registered email address and secure password.</li>
          <li>Complete 2FA verification if enabled for enhanced security. We highly recommend using an authenticator app for MFA.</li>
        </ol>
      </div>
      <div className="space-y-4">
         <h3 className="font-bold text-[#2e3d49] text-xl">Best Practices</h3>
         <p className="text-sm text-[#4a4a4a] leading-relaxed">
           Use a unique password for Tiwlo and ensure your email provider also utilizes MFA. Never share your credentials with others.
         </p>
      </div>
    </div>
  );
}
