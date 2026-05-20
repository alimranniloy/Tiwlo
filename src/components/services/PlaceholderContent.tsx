export default function PlaceholderContent({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-[#2e3d49]">{title}</h2>
      <p className="text-[#4a4a4a] leading-relaxed text-lg">Detailed documentation for {title} is currently under construction. Please check back soon for comprehensive guides and architecture overviews.</p>
    </div>
  );
}
