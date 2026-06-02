import React, { useEffect, useState } from 'react';
import {
  Key, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Shield, 
  ExternalLink,
  Code,
  Zap
} from 'lucide-react';
import { createApiCredentialWithApi, fetchApiCredentialsWithApi, revokeApiCredentialWithApi } from '../lib/tiwloApi';
import { useActionConfirmation } from '../components/ActionConfirmation';

interface Token {
  id: string;
  name: string;
  token: string;
  lastUsed: string;
  createdAt: string;
}

export default function APIPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const { confirmDelete } = useActionConfirmation();

  useEffect(() => {
    fetchApiCredentialsWithApi()
      .then((credentials) => {
        setTokens(credentials.map((credential) => ({
          id: credential.id,
          name: credential.name,
          token: `tiwlo_********************${String(credential.id).slice(-4)}`,
          lastUsed: credential.lastUsedAt ? new Date(credential.lastUsedAt).toLocaleString() : 'Never',
          createdAt: credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : '-'
        })));
      })
      .catch((err) => {
        setTokens([]);
        setError(err instanceof Error ? err.message : 'Unable to load API tokens');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (id: string) => {
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = async () => {
    try {
      const credential = await createApiCredentialWithApi({
        name: `Console Token ${new Date().toLocaleDateString()}`,
        scopes: ['cloud:write', 'domain:write', 'billing:read']
      });
      setTokens((current) => [{
        id: credential.id,
        name: credential.name,
        token: `tiwlo_********************${String(credential.id).slice(-4)}`,
        lastUsed: 'Never',
        createdAt: credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : '-'
      }, ...current]);
    } catch {
      setError('Unable to create API token');
    }
  };

  const handleRevoke = async (id: string) => {
    const token = tokens.find((item) => item.id === id);
    const confirmed = await confirmDelete({
      title: 'Revoke API token?',
      message: 'Are you sure you want to revoke this API token?',
      resourceName: token?.name || id,
      confirmLabel: 'Revoke token'
    });
    if (!confirmed) return;

    setTokens((current) => current.filter((token) => token.id !== id));
    try {
      await revokeApiCredentialWithApi(id);
    } catch {
      setError('Unable to revoke API token');
    }
  };

  return (
    <div className="mx-auto max-w-[1220px] space-y-8 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#031b4e] md:text-3xl">API Tokens</h1>
          <p className="mt-1 text-sm font-medium text-[#52637a]">Generate API tokens to interact with the Tiwlo Cloud API programmatically.</p>
        </div>
        <button onClick={handleGenerate} className="flex items-center gap-2 rounded-md bg-[#11843b] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0b6b30]">
          <Plus className="h-4 w-4" /> Generate New Token
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-[#d9e1ec] bg-white shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
        {error && <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-[13px] font-bold text-red-600">{error}</div>}
        <div className="flex items-center justify-between border-b border-[#e4e9f1] bg-[#f7f9fc] p-5">
           <div className="flex items-center gap-3">
              <Key className="h-4 w-4 text-[#111827]" />
              <h2 className="font-bold text-[#111827] text-sm uppercase tracking-wide">Personal Access Tokens</h2>
           </div>
        </div>
        <div className="divide-y divide-[#E5E7EB]">
          {loading ? (
            <div className="p-8 text-center text-sm font-bold text-[#6B7280]">Loading API tokens from API...</div>
          ) : tokens.length === 0 ? (
            <div className="p-8 text-center text-sm font-bold text-[#6B7280]">No API tokens found in the database.</div>
          ) : tokens.map((token) => (
            <div key={token.id} className="flex flex-col justify-between gap-6 overflow-hidden p-6 transition-colors hover:bg-[#f7faff] md:flex-row md:items-center">
               <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                     <h3 className="font-bold text-[#111827] text-[15px]">{token.name}</h3>
                     <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">Read/Write</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <code className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md text-[13px] font-mono text-[#374151] flex-1 md:flex-none overflow-hidden text-ellipsis whitespace-nowrap">
                        {token.token}
                     </code>
                     <button 
                      onClick={() => handleCopy(token.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                     >
                        {copied === token.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                     </button>
                  </div>
               </div>
               <div className="flex items-center gap-8 text-[12px] text-[#6B7280]">
                  <div className="text-right shrink-0">
                     <p className="font-bold text-[#9CA3AF] uppercase text-[10px] tracking-widest">Created</p>
                     <p className="font-medium text-[#374151] mt-0.5">{token.createdAt}</p>
                  </div>
                  <div className="text-right shrink-0">
                     <p className="font-bold text-[#9CA3AF] uppercase text-[10px] tracking-widest">Last Used</p>
                     <p className="font-medium text-[#374151] mt-0.5">{token.lastUsed}</p>
                  </div>
                  <button onClick={() => handleRevoke(token.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors shrink-0">
                    <Trash2 className="h-5 w-5" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="relative overflow-hidden rounded-md bg-[#031b4e] p-8 text-white shadow-[0_12px_28px_rgba(3,27,78,0.15)]">
            <Zap className="absolute -top-10 -right-10 h-48 w-48 text-blue-600 opacity-20" />
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
               <Code className="h-5 w-5 text-blue-400" /> API Documentation
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-8">
               Learn how to integrate Tiwlo Cloud into your own applications with our robust REST API and client libraries for Node.js, Python, and Go.
            </p>
            <button className="flex items-center gap-2 text-white font-bold text-sm bg-white/10 hover:bg-white/20 px-6 py-2.5 rounded-md transition-colors w-full justify-center">
               View Documentation <ExternalLink className="h-4 w-4" />
            </button>
         </div>

         <div className="flex flex-col justify-between rounded-md border border-[#d9e1ec] bg-white p-8 shadow-[0_1px_2px_rgba(3,27,78,0.04)]">
            <div>
               <h3 className="text-[16px] font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" /> Security Best Practices
               </h3>
               <ul className="space-y-4">
                  {[
                    "Never commit your tokens to source control (Git).",
                    "Rotate your tokens periodically for maximum security.",
                    "Use different tokens for different environments (Production, CI)."
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3 text-[13px] text-[#6B7280]">
                       <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                       {text}
                    </li>
                  ))}
               </ul>
            </div>
         </div>
      </div>
    </div>
  );
}
