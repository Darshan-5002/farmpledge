import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Leaf, Truck, Wallet, ShoppingBag, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/10),transparent_60%)]" />
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs md:text-sm text-muted-foreground bg-background/60 backdrop-blur">
              <Sparkles className="h-4 w-4 text-primary" />
              Blockchain-verified farm-to-table marketplace
            </span>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Farm-Fresh Dairy,{" "}
              <span className="text-primary">Direct from Source</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Shop authentic dairy, support local farmers, and track every order on-chain.
              Transparent, fair, and unbelievably fresh.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products">
                <Button size="lg" className="gap-2">
                  Shop Fresh Dairy <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register/farmer">
                <Button size="lg" variant="outline" className="gap-2">
                  Become a Farmer Partner
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-bold">10k+</p>
                <p className="text-xs text-muted-foreground">Orders fulfilled</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-muted-foreground">On-chain verified</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-bold">500+</p>
                <p className="text-xs text-muted-foreground">Happy farmers</p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-2xl font-bold">4.9</p>
                <p className="text-xs text-muted-foreground">Average rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12 space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">Why FreshPledge?</h2>
          <p className="text-muted-foreground">Trust, transparency, and taste — built into every order.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-card rounded-lg p-8 shadow-[var(--shadow-soft)] border">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Blockchain Verified</h3>
            <p className="text-muted-foreground">
              Every product is authenticated on the blockchain, ensuring complete 
              transparency from farm to table.
            </p>
          </div>

          <div className="bg-card rounded-lg p-8 shadow-[var(--shadow-soft)] border">
            <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Direct Connection</h3>
            <p className="text-muted-foreground">
              No middlemen. Farmers get fair prices while consumers enjoy 
              competitive rates on authentic dairy.
            </p>
          </div>

          <div className="bg-card rounded-lg p-8 shadow-[var(--shadow-soft)] border">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Fresh & Authentic</h3>
            <p className="text-muted-foreground">
              Track your dairy products from source. Know exactly where your 
              food comes from and who produces it.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border bg-card p-6 md:p-10">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">1. Choose products</h3>
              <p className="text-sm text-muted-foreground">Browse farmer listings and add fresh dairy to your cart.</p>
            </div>
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">2. Pay securely</h3>
              <p className="text-sm text-muted-foreground">Pay with popular wallets; settlements are mirrored on-chain.</p>
            </div>
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">3. Track delivery</h3>
              <p className="text-sm text-muted-foreground">Follow your order from farm to doorstep with full traceability.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold">Loved by consumers and farmers</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                “Freshest milk I’ve had delivered. Love the transparency — I can see the farm and batch on-chain.”
              </p>
              <div className="text-sm">
                <span className="font-medium">Ritika S.</span>
                <span className="text-muted-foreground"> • Mumbai</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Experience Fresh Dairy?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of consumers and farmers in the revolution
          </p>
          <Link to="/products">
            <Button size="lg" variant="secondary">
              Start Shopping Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-semibold">FreshPledge</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About Us</a>
              <a href="#" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
