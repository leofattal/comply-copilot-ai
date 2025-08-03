import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle } from "lucide-react";
import heroImage from "@/assets/hero-compliance.jpg";
import { analytics } from "@/lib/analytics";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-feature overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="space-y-8 animate-slideInUp">
            <Badge variant="secondary" className="inline-flex items-center space-x-2 px-4 py-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>68% of companies violate labor laws unintentionally</span>
            </Badge>
            
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                AI That <span className="text-primary">Prevents</span> HR Violations,
                <br />
                Not Just Alerts
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                ComplyAI is the first AI copilot that actively prevents labor law violations 
                before they happen, saving you from costly fines and lawsuits.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Real-time compliance answers</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Blocks violations pre-payroll</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span>Auto-updates when laws change</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="xl" 
                className="group"
                onClick={() => {
                  analytics.trackCTAClick('access_deel_dashboard', 'hero');
                  window.location.href = '/deel';
                }}
              >
                Access Deel Dashboard
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="xl" 
                className="group"
                onClick={() => {
                  analytics.trackDemoRequest();
                  window.open('https://calendly.com/complyai/demo', '_blank');
                }}
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>14-day free trial</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative lg:order-last">
            <div className="relative animate-float">
              <img 
                src={heroImage} 
                alt="HR Compliance Dashboard" 
                className="w-full h-auto rounded-2xl shadow-feature"
              />
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-card p-4 animate-glow">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-accent rounded-full"></div>
                  <span className="text-sm font-medium">95% Accuracy</span>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-card p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-sm font-medium">50+ Violations Prevented</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;