// app/auth/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Github, 
  Loader2 
} from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { projectAuth } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast"; // Fixed import path
import Image from "next/image";

export default function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { signInWithGoogle, signInWithGithub } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [backdropPath, setBackdropPath] = useState<string>("");
  const [movieDetails, setMovieDetails] = useState<{ title: string; overview: string } | null>(null);

  useEffect(() => {
    const fetchRandomMovie = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/popular?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=1`
        );
        const data = await response.json();
        const randomMovie = data.results[Math.floor(Math.random() * data.results.length)];
        setBackdropPath(`https://image.tmdb.org/t/p/original${randomMovie.backdrop_path}`);
        setMovieDetails({
          title: randomMovie.title,
          overview: randomMovie.overview
        });
      } catch (error) {
      }
    };

    fetchRandomMovie();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const normalizeEmail = (email: string) => {
    // Don't normalize admin email
    if (email === 'admin@arcinema.com') {
      return email;
    }
    
    // Handle punycode conversion for Arcinema.com domain variants
    if (email.includes('@Arcinema.com')) {
      return email.replace('@Arcinema.com', '@xn--arcinma-fya.com');
    }
    if (email.includes('@arcinema.com')) {
      return email.replace('@arcinema.com', '@xn--arcinma-fya.com');
    }
    return email;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const normalizedEmail = normalizeEmail(formData.email);
      await signInWithEmailAndPassword(
        projectAuth,
        normalizedEmail,
        formData.password
      );

      router.push("/");
    } catch (error: unknown) {
      let errorMessage = "Invalid email or password. Please try again.";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        
        switch (firebaseError.code) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email. Please sign up first.";
            break;
          case 'auth/wrong-password':
            errorMessage = "Incorrect password. Please try again.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Invalid email format.";
            break;
          case 'auth/invalid-credential':
            errorMessage = "Invalid email or password. Please check your credentials.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
        }
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error: unknown) {
      toast({
        title: "Google login failed",
        description: "Unable to sign in with Google. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGithub();
    } catch (error: unknown) {
      toast({
        title: "GitHub login failed",
        description: "Unable to sign in with GitHub. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden">
      {/* Left Panel - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 overflow-y-auto scrollbar-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-4xl font-galindo text-white mb-2"
            >
              Arcinema
            </motion.h1>
            <p className="text-sm text-gray-400 font-light">
              Sign in to continue your journey
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl
                           text-white placeholder:text-gray-600 
                           focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07]
                           transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-xl
                           text-white placeholder:text-gray-600
                           focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07]
                           transition-all duration-200"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 py-3.5 rounded-xl font-medium
                       bg-gradient-to-r from-indigo-600 to-indigo-500 
                       hover:from-indigo-500 hover:to-indigo-400
                       text-white shadow-lg shadow-indigo-500/20
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-black text-gray-500 text-xs uppercase tracking-wider">
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 
                       bg-white/5 border border-white/10 rounded-xl
                       text-white hover:bg-white/[0.07] hover:border-white/20
                       transition-all duration-200 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="font-medium">Continue with Google</span>
            </button>
            
            <button
              type="button"
              onClick={handleGithubLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 
                       bg-white/5 border border-white/10 rounded-xl
                       text-white hover:bg-white/[0.07] hover:border-white/20
                       transition-all duration-200 active:scale-[0.98]
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Github className="w-5 h-5" />
              <span className="font-medium">Continue with GitHub</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-indigo-500 hover:text-indigo-400 font-medium"
            >
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Movie Backdrop */}
      <div className="hidden md:block md:w-1/2 relative overflow-hidden">
        {backdropPath && (
          <>
            <motion.div
              initial={{ scale: 1.1 }}
              animate={{ scale: 1.2 }}
              transition={{ 
                duration: 10, 
                ease: "linear",
                repeat: Infinity, 
                repeatType: "reverse" 
              }}
              className="absolute inset-0"
            >
              <Image
                src={backdropPath}
                alt="Movie backdrop"
                fill
                className="object-cover"
                priority
                quality={100}
              />
            </motion.div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
            
            {/* Movie Title Overlay */}
            {movieDetails && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute inset-x-0 bottom-0 p-8 space-y-4"
              >
                <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                  {movieDetails.title}
                </h2>
                <p className="text-gray-200 line-clamp-2 max-w-lg text-sm">
                  {movieDetails.overview}
                </p>
                <div className="flex gap-4 pt-2">
                  <Link href="/privacy" className="text-xs text-gray-400 hover:text-white underline underline-offset-2 transition-colors">
                    Privacy
                  </Link>
                  <Link href="/terms" className="text-xs text-gray-400 hover:text-white underline underline-offset-2 transition-colors">
                    Terms
                  </Link>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}