"use client";

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-black flex flex-col justify-center items-center overflow-hidden">
      {/* Subtle grid pattern background */}
      <div className="absolute inset-0 opacity-[0.02] grid-pattern" />
      
      {/* Minimal elegant loading */}
      <div className="relative z-10 text-center space-y-8 px-4">
        {/* Simple ring spinner */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-[1px] border-white/5" />
          <div className="absolute inset-0 rounded-full border-[1px] border-transparent border-t-white/40 animate-spin-slow" />
        </div>
        
        {/* Logo name only */}
        <h1 className="text-3xl text-white/90 tracking-[0.3em] uppercase font-galindo">
          Arcinema
        </h1>
      </div>
    </div>
  );
};

export default LoadingSpinner; 