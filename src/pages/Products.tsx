import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Search, 
  ShoppingCart, 
  Leaf, 
  IndianRupee,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  LogIn
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  image?: string; // Legacy single image
  images?: string[]; // Multiple images array
  ownerId?: string | null;
  ownerName?: string | null;
  expiryDate?: string | null;
}

const Products = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0);

  useEffect(() => {
    if (!db) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    let cleanup: (() => void) | undefined;
    const subscribePrimary = () => {
      try {
        const q = query(
          collection(db, "products"),
          where("inStock", "==", true),
          orderBy("name"),
        );
        cleanup = onSnapshot(
          q,
          (snapshot) => {
            const items: Product[] = snapshot.docs.map((d) => {
              const data = d.data() as any;
              const priceValue = Number(data.price);
              return {
                id: d.id,
                name: data.name ?? "",
                description: data.description ?? "",
                price: isNaN(priceValue) || priceValue <= 0 ? 0 : priceValue,
                category: data.category ?? "Dairy",
                inStock: Boolean(data.inStock),
                image: data.image ?? undefined,
                images: data.images ?? (data.image ? [data.image] : undefined),
                ownerId: data.ownerId ?? null,
                ownerName: data.ownerName ?? null,
                expiryDate: data.expiryDate ?? null,
              };
            });
            setProducts(items);
            setIsLoading(false);
          },
          (err: any) => {
            console.warn("Primary products query failed, falling back:", err?.code || err);
            // Fallback: subscribe to the whole collection and filter client-side
            try {
              cleanup = onSnapshot(
                collection(db, "products"),
                (snapshot) => {
                  const items: Product[] = snapshot.docs
                    .map((d) => {
                      const data = d.data() as any;
                      const priceValue = Number(data.price);
                      return {
                        id: d.id,
                        name: data.name ?? "",
                        description: data.description ?? "",
                        price: isNaN(priceValue) || priceValue <= 0 ? 0 : priceValue,
                        category: data.category ?? "Dairy",
                        inStock: Boolean(data.inStock),
                        image: data.image ?? undefined,
                        images: data.images ?? (data.image ? [data.image] : undefined),
                        ownerId: data.ownerId ?? null,
                        ownerName: data.ownerName ?? null,
                        expiryDate: data.expiryDate ?? null,
                      };
                    })
                    .filter((p) => p.inStock);
                  setProducts(items);
                  setIsLoading(false);
                },
                (fallbackErr) => {
                  console.error("Fallback products query also failed", fallbackErr);
                  setError("Failed to load products");
                  setIsLoading(false);
                },
              );
            } catch (fallbackSetupErr) {
              console.error("Failed to set up fallback subscription", fallbackSetupErr);
              setError("Failed to load products");
              setIsLoading(false);
            }
          },
        );
      } catch (setupErr) {
        console.error("Products subscription setup error", setupErr);
        setError("Failed to load products");
        setIsLoading(false);
      }
    };
    subscribePrimary();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [products, searchQuery],
  );

  const handleBuyNow = (product: Product) => {
    // Check if user is logged in
    if (!user) {
      toast.error("Please login to purchase products", {
        description: "You need to be logged in to make a purchase.",
        action: {
          label: "Login",
          onClick: () => navigate("/login"),
        },
      });
      return;
    }

    navigate("/checkout", {
      state: { product },
    });
  };

  const handleImageNavigation = (productId: string, direction: "prev" | "next", images: string[]) => {
    const currentIndex = currentImageIndex[productId] || 0;
    let newIndex: number;
    
    if (direction === "prev") {
      newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    }
    
    setCurrentImageIndex({
      ...currentImageIndex,
      [productId]: newIndex,
    });
  };

  const openLightbox = (images: string[], startIndex: number = 0) => {
    setLightboxImages(images);
    setLightboxCurrentIndex(startIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
    setLightboxCurrentIndex(0);
  };

  const handleLightboxNavigation = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setLightboxCurrentIndex(
        lightboxCurrentIndex === 0 ? lightboxImages.length - 1 : lightboxCurrentIndex - 1
      );
    } else {
      setLightboxCurrentIndex(
        lightboxCurrentIndex === lightboxImages.length - 1 ? 0 : lightboxCurrentIndex + 1
      );
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        setLightboxCurrentIndex((prev) =>
          prev === 0 ? lightboxImages.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowRight") {
        setLightboxCurrentIndex((prev) =>
          prev === lightboxImages.length - 1 ? 0 : prev + 1
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxImages.length]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Fresh Dairy Products</h1>
          <p className="text-muted-foreground">
            Buy directly from farmers - blockchain verified, 100% authentic
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground">Loading products...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-destructive">Failed to load products. Please try again.</p>
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <p className="text-muted-foreground">No products available right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden relative group">
                    {(() => {
                      const images = product.images || (product.image ? [product.image] : []);
                      const currentIndex = currentImageIndex[product.id] || 0;
                      
                      if (images.length === 0) {
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            <Leaf className="h-12 w-12 text-muted-foreground" />
                          </div>
                        );
                      }
                      
                      return (
                        <div className="relative w-full h-full">
                          <img
                            src={images[currentIndex]}
                            alt={product.name}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => openLightbox(images, currentIndex)}
                          />
                          
                          {/* Navigation Arrows - Only show if multiple images */}
                          {images.length > 1 && (
                            <>
                              {/* Left Arrow */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageNavigation(product.id, "prev", images);
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                aria-label="Previous image"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              
                              {/* Right Arrow */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageNavigation(product.id, "next", images);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                aria-label="Next image"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              
                              {/* Image Counter */}
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                {currentIndex + 1} / {images.length}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription>{product.description}</CardDescription>
                  {product.expiryDate && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Expires: {new Date(product.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Farmer</p>
                        <p className="font-medium">{product.ownerName ?? "Verified farmer"}</p>
                      </div>
                      <Badge variant="secondary">{product.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-2xl font-bold flex items-center gap-1">
                          <IndianRupee className="h-5 w-5" />
                          {(product.price || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <span className="w-full inline-block">
                            <Button
                              onClick={() => handleBuyNow({
                                ...product,
                                ownerId: product.ownerId ?? undefined,
                                ownerName: product.ownerName ?? undefined,
                              })}
                              className="w-full"
                              disabled={!product.inStock || !user}
                            >
                              {!user ? (
                                <>
                                  <LogIn className="mr-2 h-4 w-4" />
                                  Login to Buy
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  {product.inStock ? "Buy Now" : "Out of Stock"}
                                </>
                              )}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!user && (
                          <TooltipContent>
                            <p>Please login to purchase this product</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-20 bg-black/50 hover:bg-black/70 p-2 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Left Navigation */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLightboxNavigation("prev");
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full z-20 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Image Container */}
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxCurrentIndex]}
              alt={`Image ${lightboxCurrentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {/* Image Counter */}
            {lightboxImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full">
                {lightboxCurrentIndex + 1} / {lightboxImages.length}
              </div>
            )}
          </div>

          {/* Right Navigation */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLightboxNavigation("next");
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full z-20 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

        </div>
      )}
    </div>
  );
};

export default Products;

