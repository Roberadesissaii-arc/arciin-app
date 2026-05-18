import ComingSoon from "@/components/utility/ComingSoon";

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Downloads</h1>
          <p className="text-gray-400">Your downloaded content for offline viewing</p>
        </div>
        <ComingSoon />
      </div>
    </div>
  );
}
