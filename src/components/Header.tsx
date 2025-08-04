import { Button } from "@/components/ui/button";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">ComplyAI</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors">
              Solutions
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">
              About
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => window.location.href = '/login'}
            >
              Sign In
            </Button>
            <Button 
              variant="hero"
              onClick={() => window.location.href = '/dashboard'}
            >
              Start Free Trial
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col space-y-4">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors" onClick={toggleMenu}>
                Features
              </a>
              <a href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors" onClick={toggleMenu}>
                Solutions
              </a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors" onClick={toggleMenu}>
                Pricing
              </a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors" onClick={toggleMenu}>
                About
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors" onClick={toggleMenu}>
                Contact
              </a>
              <div className="pt-4 space-y-3">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start"
                  onClick={() => {
                    toggleMenu();
                    window.location.href = '/login';
                  }}
                >
                  Sign In
                </Button>
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => {
                    toggleMenu();
                    window.location.href = '/dashboard';
                  }}
                >
                  Start Free Trial
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;