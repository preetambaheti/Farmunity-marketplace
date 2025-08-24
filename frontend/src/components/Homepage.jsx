import React, { useEffect, useState } from "react";
import { ArrowRight, Truck, BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Homepage({ onNavigate }) {
  const navigate = useNavigate();

  const go = (path, slug) => {
    try {
      if (typeof onNavigate === "function") onNavigate(slug || path.replace("/", ""));
    } catch {}
    navigate(path);
  };

  // ---- Hero slider (remote image URLs) ----
  const heroImages = [
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=2400&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1492496913980-501348b61469?q=80&w=2400&auto=format&fit=crop",
  ];
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    heroImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [heroImages]);

  useEffect(() => {
    if (!heroImages.length) return;
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (prefersReduced) return;
    const t = setInterval(() => setSlide((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* ===== Hero Section (slider) ===== */}
      {/* mt-16 ensures content starts below the fixed header */}
      <div className="relative text-white overflow-hidden min-h-[520px] sm:mt-0">
        {/* Slides */}
        {heroImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}

        {/* Uniform overlay, non-interactive */}
        <div className="absolute inset-0 bg-black/30 md:bg-black/20 lg:bg-black/10 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="text-center w-full pt-6 pb-20 sm:pt-10 sm:pb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Empowering Farmers with Fair Prices,
              <br className="hidden md:block" />
              Equipment Access, and Knowledge
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
              Join India's most trusted digital ecosystem for farmers. Connect
              directly with buyers, access modern equipment, and grow with
              expert guidance.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => go("/marketplace", "marketplace")}
                className="w-full sm:w-auto bg-white text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <TrendingUp className="h-5 w-5" />
                Sell Crops
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => go("/equipment", "equipment")}
                className="w-full sm:w-auto bg-green-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-900 transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="h-5 w-5" />
                Rent Equipment
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => go("/knowledge", "knowledge")}
                className="w-full sm:w-auto bg-yellow-500 text-green-900 px-8 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
              >
                <BookOpen className="h-5 w-5" />
                Get Support
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dots — nudged a bit lower on md+, but kept clear of CTAs on mobile */}
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-2.5 w-2.5 rounded-full ${
                i === slide ? "bg-white" : "bg-white/60 hover:bg-white/80"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ===== Quick Services Highlight ===== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Why Choose Farmunity?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built by farmers, for farmers. We understand your challenges and
            provide solutions that work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Direct Market Access
            </h3>
            <p className="text-gray-600 mb-4">
              Skip middlemen and sell directly to buyers at fair prices.
              Real-time market rates with transparent pricing.
            </p>
            <button
              onClick={() => go("/marketplace", "marketplace")}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mx-auto"
            >
              Explore Marketplace <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Equipment Sharing
            </h3>
            <p className="text-gray-600 mb-4">
              Access modern farming equipment when you need it. Rent, lease, or
              share with fellow farmers.
            </p>
            <button
              onClick={() => go("/equipment", "equipment")}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mx-auto"
            >
              Browse Equipment <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Expert Guidance
            </h3>
            <p className="text-gray-600 mb-4">
              Get AI-powered crop advice, weather updates, and connect with
              agricultural experts anytime.
            </p>
            <button
              onClick={() => go("/knowledge", "knowledge")}
              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mx-auto"
            >
              Get Support <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
