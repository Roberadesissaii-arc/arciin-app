// components/movies/MovieHero.tsx
import { Button } from "@/components/ui/button";
import { Play, Info } from "lucide-react";
import Image from "next/image";

interface MovieHeroProps {
  movie: {
    backdrop_path: string;
    title: string;
    overview: string;
    release_date: string;
  };
}

const MovieHero = ({ movie }: MovieHeroProps) => {
  return (
    <div className="relative h-[80vh] w-full">
      <div className="absolute inset-0">
        <Image
          src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
          alt={movie.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 p-8 max-w-2xl space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
          {movie.title}
        </h1>
        <p className="text-lg text-gray-200 line-clamp-3">
          {movie.overview}
        </p>
        <div className="flex items-center space-x-4">
          <Button size="lg" className="bg-white text-black hover:bg-white/90">
            <Play className="mr-2 h-5 w-5" /> Play Now
          </Button>
          <Button size="lg" variant="outline">
            <Info className="mr-2 h-5 w-5" /> More Info
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MovieHero;