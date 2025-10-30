import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Users, Leaf } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">FreshPledge</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register/consumer">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Farm-Fresh Dairy,{" "}
            <span className="text-primary">Direct from Source</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect directly with dairy farmers through blockchain technology. 
            Authentic products, fair prices, complete transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register/consumer">
              <Button size="lg" className="gap-2">
                Shop Fresh Dairy <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/register/farmer">
              <Button size="lg" variant="outline">
                Become a Farmer Partner
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
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

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-2xl p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Experience Fresh Dairy?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of consumers and farmers in the revolution
          </p>
          <Link to="/register/consumer">
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
