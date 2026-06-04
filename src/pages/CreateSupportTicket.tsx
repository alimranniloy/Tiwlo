import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Flag,
  Headphones,
  HelpCircle,
  Mail,
  MessageCircle,
  Paperclip,
  Send,
  Server,
  Ticket,
  UploadCloud,
  Users
} from 'lucide-react';
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createSupportTicketWithApi } from '../lib/tiwloApi';

const departments = [
  'Technical Support',
  'Billing Support',
  'Account Support',
  'Abuse & Security'
];

const priorities = ['High', 'Medium', 'Low'];

const relatedServices = [
  'Select a service (e.g., Droplet, Database, DNS)',
  'Droplet',
  'Database',
  'DNS',
  'Billing',
  'Tiwlo Pay',
  'Kubernetes',
  'Volumes'
];

function CreateTicketGraphic() {
  return (
    <div className="relative hidden h-[190px] w-[310px] overflow-hidden lg:block">
      <div className="absolute left-[72px] top-7 h-28 w-36 rotate-[-4deg] rounded-[18px] border border-[#dad6ff] bg-[#f1efff]" />
      <div className="absolute left-[105px] top-[66px] h-24 w-40 rotate-[3deg] overflow-hidden rounded-[18px] border border-[#d6d0ff] bg-[#6957ff]">
        <div className="absolute left-0 top-0 h-16 w-full bg-[#ede9ff]" />
        <div className="absolute bottom-0 left-0 h-20 w-full rounded-t-[45px] bg-[#5138ef]" />
      </div>
      <div className="absolute left-[104px] top-[33px] h-5 w-16 rounded-full bg-[#5636e8]" />
      <div className="absolute left-[215px] top-[54px] flex h-9 w-14 items-center justify-center rounded-[10px] bg-[#5636e8]">
        <MessageCircle className="h-5 w-5 text-white" />
      </div>
      <div className="absolute left-[250px] top-[82px] flex h-8 w-12 items-center justify-center rounded-[10px] bg-[#7e6bff]">
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
        <span className="mx-1 h-1.5 w-1.5 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white" />
      </div>
      <div className="absolute left-8 top-[86px] h-4 w-4 rounded-full bg-[#b6a8ff]" />
      <div className="absolute bottom-9 left-14 h-3 w-3 rounded-full bg-[#cfc5ff]" />
      <div className="absolute bottom-5 right-16 h-5 w-5 rounded-full bg-[#dfd8ff]" />
    </div>
  );
}

function SelectBox({
  label,
  icon,
  value,
  onChange,
  options
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-3 block text-[13px] font-black text-[#111827]">{label}</span>
      <span className="relative flex h-14 items-center rounded-[8px] border border-[#dfe3ec] bg-white px-4">
        <span className="mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#f1efff] text-[#5636e8]">
          {icon}
        </span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 appearance-none bg-transparent pr-8 text-[15px] font-black text-[#111827] outline-none"
        >
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 h-5 w-5 text-[#667085]" />
      </span>
    </label>
  );
}

function SideInfoCard({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-[#e6e9f2] bg-white p-6">
      <h3 className="text-[18px] font-black tracking-tight text-[#111827]">{title}</h3>
      {children}
    </div>
  );
}

export default function CreateSupportTicket() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(departments[0]);
  const [priority, setPriority] = useState(priorities[0]);
  const [subject, setSubject] = useState('');
  const [relatedService, setRelatedService] = useState(relatedServices[0]);
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const descriptionValid = description.trim().length >= 10;
  const canSubmit = subject.trim() && descriptionValid && !isSubmitting;

  const attachmentSummary = useMemo(() => (
    attachments.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type || 'unknown'
    }))
  ), [attachments]);

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(files);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');

    try {
      await createSupportTicketWithApi({
        subject: subject.trim(),
        category: department,
        priority,
        message: description.trim(),
        metadata: {
          source: 'support-create-page',
          relatedService: relatedService === relatedServices[0] ? '' : relatedService,
          attachments: attachmentSummary
        }
      });
      setSubmitSuccess('Ticket submitted successfully.');
      window.dispatchEvent(new CustomEvent('tiwlo:data-refresh'));
      window.setTimeout(() => navigate('/support'), 500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] pb-10 text-[#111827]">
      <div className="mb-6 flex items-center gap-2 text-[14px] font-semibold text-[#7b8496]">
        <Link to="/support" className="hover:text-[#4f35ff]">Support</Link>
        <ArrowRight className="h-4 w-4" />
        <span className="text-[#667085]">Create Ticket</span>
      </div>

      <header className="mb-8 grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-[#f1efff]">
            <Ticket className="h-8 w-8 text-[#5636e8]" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[30px] font-black tracking-tight text-[#111827] md:text-[34px]">
              Create a Support Ticket
            </h1>
            <p className="mt-2 text-[16px] font-semibold text-[#2e3550]">
              Fill out the form below to submit a request to our support team.
            </p>
          </div>
        </div>
        <CreateTicketGraphic />
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
        <form onSubmit={handleSubmit} className="rounded-[16px] border border-[#e6e9f2] bg-white p-5 md:p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SelectBox
              label="Select Department"
              icon={<Ticket className="h-5 w-5" />}
              value={department}
              onChange={setDepartment}
              options={departments}
            />
            <SelectBox
              label="Priority"
              icon={<Flag className="h-5 w-5 text-[#ff385c]" />}
              value={priority}
              onChange={setPriority}
              options={priorities}
            />
          </div>

          <label className="mt-7 block">
            <span className="mb-3 block text-[13px] font-black text-[#111827]">Subject</span>
            <input
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Briefly describe your issue"
              className="h-14 w-full rounded-[8px] border border-[#dfe3ec] bg-white px-4 text-[15px] font-semibold text-[#111827] outline-none placeholder:text-[#9aa3b4] focus:border-[#4f35ff]"
            />
          </label>

          <div className="mt-7">
            <SelectBox
              label="Related Service (Optional)"
              icon={<Server className="h-5 w-5" />}
              value={relatedService}
              onChange={setRelatedService}
              options={relatedServices}
            />
          </div>

          <label className="mt-7 block">
            <span className="mb-3 block text-[13px] font-black text-[#111827]">Description</span>
            <textarea
              required
              rows={7}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Please provide as much detail as possible about your issue..."
              className="w-full resize-none rounded-[8px] border border-[#dfe3ec] bg-white px-4 py-4 text-[15px] font-semibold leading-6 text-[#111827] outline-none placeholder:text-[#9aa3b4] focus:border-[#4f35ff]"
            />
            <div className="mt-2 flex items-center justify-between gap-4 text-[12px] font-semibold text-[#7b8496]">
              <span>Minimum 10 characters</span>
              <span>{Math.min(description.trim().length, 10)}/10</span>
            </div>
          </label>

          <div className="mt-7">
            <p className="mb-3 text-[13px] font-black text-[#111827]">Attachments (Optional)</p>
            <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-[#cfd5e3] bg-[#fbfbff] px-4 py-5 text-center transition-colors hover:border-[#9d8cff]">
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={handleAttachmentChange}
                accept=".jpg,.jpeg,.png,.pdf,.txt"
              />
              <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#f1efff]">
                <UploadCloud className="h-6 w-6 text-[#5636e8]" />
              </span>
              <span className="max-w-full truncate text-[13px] font-black text-[#273043]">
                Drag & drop files here or click to browse
              </span>
              <span className="mt-1 text-[12px] font-semibold text-[#7b8496]">
                Max file size: 10MB (jpg, png, pdf, txt)
              </span>
            </label>
            {attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-2 rounded-[8px] border border-[#e6e9f2] bg-white px-3 py-2 text-[12px] font-bold text-[#4b5565]">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {submitError && (
            <div className="mt-6 rounded-[12px] border border-[#ffd6dc] bg-[#fff5f6] px-4 py-3 text-[13px] font-bold text-[#d92d4b]">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="mt-6 flex items-center gap-2 rounded-[12px] border border-[#c7f0d8] bg-[#f0fbf5] px-4 py-3 text-[13px] font-bold text-[#14a66d]">
              <CheckCircle2 className="h-4 w-4" />
              {submitSuccess}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              to="/support"
              className="flex h-12 items-center justify-center rounded-[8px] border border-[#cfd5e3] bg-white px-8 text-[14px] font-black text-[#4b5565] transition-colors hover:border-[#9aa3b4]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex h-12 items-center justify-center gap-3 rounded-[8px] bg-[#4f2fff] px-9 text-[14px] font-black text-white transition-colors hover:bg-[#3e24df] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Ticket
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <aside className="space-y-5">
          <SideInfoCard title="Before You Submit">
            <div className="mt-5 space-y-5">
              {[
                { icon: BookOpen, title: 'Check our documentation', text: 'Many answers can be found in our docs.', bg: 'bg-[#f1efff]', color: 'text-[#5636e8]' },
                { icon: Users, title: 'Search existing tickets', text: 'Your issue might already be reported.', bg: 'bg-[#eef7ff]', color: 'text-[#2377d9]' },
                { icon: CheckCircle2, title: 'Provide detailed information', text: 'More details help us resolve faster.', bg: 'bg-[#e8faef]', color: 'text-[#22a96b]' }
              ].map((item) => (
                <div key={item.title} className="grid grid-cols-[44px_minmax(0,1fr)] gap-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${item.bg}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-[#1f2937]">{item.title}</p>
                    <p className="mt-1 text-[12px] font-semibold leading-5 text-[#7b8496]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </SideInfoCard>

          <SideInfoCard title="Support Information">
            <div className="mt-5 space-y-5">
              {[
                { icon: Clock, title: 'Response Time', text: 'Usually within 2 hours' },
                { icon: Headphones, title: 'Support Channels', text: '24/7 Available' },
                { icon: Mail, title: 'Email Support', text: 'support@tiwlo.com' },
                { icon: FileText, title: 'Live Chat', text: 'Available 24/7' }
              ].map((item) => (
                <div key={item.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-4">
                  <item.icon className="mt-0.5 h-5 w-5 text-[#5e6b83]" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-black text-[#1f2937]">{item.title}</p>
                    <p className="mt-1 break-words text-[12px] font-semibold leading-5 text-[#7b8496]">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </SideInfoCard>

          <div className="rounded-[16px] border border-[#eeeaff] bg-[#f3f0ff] p-6">
            <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-white">
                <Headphones className="h-7 w-7 text-[#5636e8]" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-black text-[#111827]">Need immediate help?</h3>
                <p className="mt-2 text-[13px] font-semibold leading-5 text-[#687083]">
                  Chat with our support team in real-time.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('tiwlo:open-chat', { detail: { source: 'create-ticket-page' } }))}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] border border-[#e5ddff] bg-[#eee9ff] text-[14px] font-black text-[#4f35ff]"
            >
              Start Live Chat
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </aside>
      </div>

      <p className="mt-10 text-center text-[13px] font-semibold text-[#7b8496]">
        (c) 2025 Tiwlo. All rights reserved.
      </p>
    </div>
  );
}
