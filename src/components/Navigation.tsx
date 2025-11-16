import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Leaf, LogOut, User, ShoppingBag, Tractor, Shield, ShoppingCart } from "lucide-react";

const Navigation = () => {
  const { user, role, verificationStatus, signOutUser } = useAuth();
  const { getItemCount, clearCart } = useCart();

  const handleSignOut = async () => {
    // Clear cart when user logs out
    clearCart();
    await signOutUser();
    window.location.href = "/";
  };

  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || "U";
  };

  const getDashboardLink = () => {
    // If user is logged in but role is not loaded yet, default to /admin
    // This handles the case where role might be null temporarily
    if (user && !role) {
      return "/admin";
    }
    if (role === "farmer") {
      if (verificationStatus === "approved") {
        return "/admin";
      }
      return "/farmer/verification";
    }
    // If role is admin or farmer, go to admin panel
    if (role === "admin") {
      return "/admin";
    }
    // For consumers, go to consumer dashboard
    if (role === "consumer") {
      return "/dashboard";
    }
    // Default fallback: if user is logged in, go to admin (for farmers)
    // This ensures farmers always go to admin even if role check fails
    if (user) {
      return "/admin";
    }
    return "/dashboard";
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Leaf className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">FreshPledge</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/products">
                <Button variant="ghost">Products</Button>
              </Link>
              <Link to="/cart">
                <Button variant="ghost" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {getItemCount() > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {getItemCount() > 99 ? "99+" : getItemCount()}
                    </Badge>
                  )}
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      {role && (
                        <Badge variant="secondary" className="mt-1 w-fit">
                          {role === "admin" && <Shield className="mr-1 h-3 w-3" />}
                          {role === "farmer" && <Tractor className="mr-1 h-3 w-3" />}
                          {role === "consumer" && <ShoppingBag className="mr-1 h-3 w-3" />}
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={getDashboardLink()} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/products" className="cursor-pointer">
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Products
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/products">
                <Button variant="ghost">Products</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register/consumer">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

