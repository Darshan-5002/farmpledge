import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
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
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<Record<string, number>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxCurrentIndex, setLightboxCurrentIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionRef = useRef<HTMLDivElement>(null);

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
            // Firestore composite index may not exist - fallback works fine
            // Only log in development mode to reduce console noise
            if (import.meta.env.DEV) {
              console.info("Using fallback query (composite index not required):", err?.code || "index missing");
            }
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

  // Generate search suggestions based on products
  useEffect(() => {
    if (!searchQuery.trim() || products.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    
    // Collect suggestions with priority scores
    const suggestionMap = new Map<string, number>();
    
    // Filter out own products for farmers
    const availableProducts = products.filter(
      (product) => !user || product.ownerId !== user.uid
    );
    
    availableProducts.forEach((product) => {
      const name = product.name.toLowerCase();
      const category = product.category.toLowerCase();
      const description = product.description.toLowerCase();
      
      // Priority 1: Exact product name match (highest priority)
      if (name.startsWith(query)) {
        suggestionMap.set(product.name, (suggestionMap.get(product.name) || 0) + 100);
      }
      // Priority 2: Product name contains query
      else if (name.includes(query)) {
        suggestionMap.set(product.name, (suggestionMap.get(product.name) || 0) + 50);
      }
      // Priority 3: Product name words start with query
      else {
        const nameWords = name.split(/\s+/);
        nameWords.forEach((word) => {
          if (word.startsWith(query) && word.length >= query.length) {
            suggestionMap.set(product.name, (suggestionMap.get(product.name) || 0) + 30);
          }
        });
      }
      
      // Category matches
      if (category.startsWith(query)) {
        suggestionMap.set(product.category, (suggestionMap.get(product.category) || 0) + 40);
      } else if (category.includes(query)) {
        suggestionMap.set(product.category, (suggestionMap.get(product.category) || 0) + 20);
      }
      
      // Description keywords
      const descWords = description.split(/\s+/);
      descWords.forEach((word) => {
        if (word.startsWith(query) && word.length >= 3) {
          const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
          if (capitalized.length >= 3) {
            suggestionMap.set(capitalized, (suggestionMap.get(capitalized) || 0) + 10);
          }
        }
      });
    });
    
    // Add common product-related keywords
    const commonKeywords = [
      // Dairy products
      "milk", "butter", "cheese", "yogurt", "organic", "fresh", "dairy", "farm", "cream", "ghee",
      "curd", "paneer", "cottage cheese", "mozzarella", "cheddar", "buttermilk", "lassi", 
      "kefir", "sour cream", "whipped cream", "heavy cream", "light cream", "half and half",
      "ice cream", "gelato", "frozen yogurt", "sherbet", "milk powder", "condensed milk",
      "evaporated milk", "skim milk", "whole milk", "low fat milk", "full cream milk",
      "goat milk", "buffalo milk", "cow milk", "almond milk", "soy milk", "coconut milk",
      "cream cheese", "ricotta", "feta", "parmesan", "swiss cheese", "provolone",
      "mascarpone", "brie", "camembert", "blue cheese", "goat cheese", "sheep cheese",
      "clarified butter", "cultured butter", "salted butter", "unsalted butter",
      "dairy products", "dairy items", "fresh dairy", "organic dairy",
      // Vegetables
      "vegetables", "vegetable", "tomato", "potato", "onion", "carrot", "cabbage", "cauliflower", 
      "broccoli", "spinach", "lettuce", "cucumber", "pepper", "beans", "peas", "corn",
      // Fruits
      "fruits", "fruit", "apple", "banana", "orange", "mango", "grapes", "berries"
    ];
    commonKeywords.forEach((keyword) => {
      if (keyword.startsWith(query)) {
        // Capitalize each word in multi-word keywords
        const capitalized = keyword
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        suggestionMap.set(capitalized, (suggestionMap.get(capitalized) || 0) + 25);
      } else if (keyword.includes(query)) {
        // Capitalize each word in multi-word keywords
        const capitalized = keyword
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        suggestionMap.set(capitalized, (suggestionMap.get(capitalized) || 0) + 15);
      }
    });
    
    // Sort by priority and limit to 5 suggestions
    const suggestionArray = Array.from(suggestionMap.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by priority (descending)
      .slice(0, 5)
      .map(([suggestion]) => suggestion);
    
    setSuggestions(suggestionArray);
    setShowSuggestions(suggestionArray.length > 0);
  }, [searchQuery, products, user]);

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (product) => {
          // Filter by search query
          const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.category.toLowerCase().includes(searchQuery.toLowerCase());
          
          // Exclude products listed by the current farmer (if logged in as farmer)
          const isOwnProduct = user && product.ownerId === user.uid;
          
          return matchesSearch && !isOwnProduct;
        }
      ),
    [products, searchQuery, user],
  );
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Focus back on input after selection
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Search products..."]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }, 0);
  };

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

    console.log("Navigating to checkout with product:", {
      id: product.id,
      name: product.name,
      ownerId: product.ownerId,
      ownerName: product.ownerName,
    });
    
    navigate("/checkout", {
      state: { 
        product: {
          ...product,
          ownerId: product.ownerId ?? null,
          ownerName: product.ownerName ?? null,
        }
      },
    });
  };

  const handleAddToCart = (product: Product) => {
    // Check if user is logged in
    if (!user) {
      toast.error("Please login to add products to cart", {
        description: "You need to be logged in to add items to your cart.",
        action: {
          label: "Login",
          onClick: () => navigate("/login"),
        },
      });
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
      images: product.images,
      category: product.category,
      ownerId: product.ownerId ?? null,
      ownerName: product.ownerName ?? null,
      inStock: product.inStock,
    });
    toast.success(`${product.name} added to cart`);
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={(e) => {
                // Check if the blur is caused by clicking on a suggestion
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!suggestionRef.current?.contains(relatedTarget)) {
                  // Delay hiding suggestions to allow click events
                  setTimeout(() => setShowSuggestions(false), 200);
                }
              }}
              className="pl-10"
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div 
                ref={suggestionRef}
                className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto"
                onMouseDown={(e) => {
                  // Prevent input blur when clicking on suggestions
                  e.preventDefault();
                }}
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(suggestion);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
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
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <span className="flex-1">
                              <Button
                                variant="outline"
                                onClick={() => handleAddToCart({
                                  ...product,
                                  ownerId: product.ownerId ?? undefined,
                                  ownerName: product.ownerName ?? undefined,
                                })}
                                className="w-full"
                                disabled={!product.inStock}
                              >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Add to Cart
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {!product.inStock && (
                            <TooltipContent>
                              <p>This product is out of stock</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                            <span className="flex-1">
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
                                    Login
                                </>
                              ) : (
                                <>
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

