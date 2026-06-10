export default function TiwloRouteLoader() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white">
      <div className="flex h-14 w-14 animate-spin items-center justify-center rounded-full border-4 border-gray-200 border-t-[#0069ff] text-xl text-[#0069ff]">
        <img
          src="/brand/icon.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="h-3.5 w-3.5 animate-ping object-contain"
        />
      </div>
    </div>
  );
}
