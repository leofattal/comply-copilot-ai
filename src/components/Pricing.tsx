import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "$299",
      period: "/month",
      description: "Perfect for small teams just getting started with compliance",
      features: [
        "Up to 50 employees",
        "Basic compliance chatbot",
        "Monthly payroll audits",
        "Email support",
        "Core labor law coverage"
      ],
      cta: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional",
      price: "$599", 
      period: "/month",
      description: "Most popular for growing companies with complex needs",
      features: [
        "Up to 200 employees",
        "Advanced AI compliance assistant",
        "Real-time payroll blocking",
        "Auto policy updates",
        "Priority support",
        "All 50 states coverage",
        "API integrations",
        "Custom compliance rules"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with specialized requirements",
      features: [
        "Unlimited employees",
        "White-label solution",
        "Dedicated success manager",
        "Custom AI training",
        "Advanced analytics",
        "Multi-location support",
        "SSO & advanced security",
        "24/7 phone support"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const stats = [
    { value: "95%", label: "Accuracy Rate" },
    { value: "50+", label: "Violations Prevented Monthly" },
    { value: "$2.5M", label: "Average Fines Saved" },
    { value: "14 Days", label: "Free Trial" }
  ];

  return (
    <section id="pricing" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <Badge variant="secondary" className="inline-flex items-center px-4 py-2">
            Pricing Plans
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Choose Your <span className="text-primary">Protection</span> Level
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Start with our free trial and scale as you grow. All plans include our core 
            violation prevention technology.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center space-y-2">
              <div className="text-3xl lg:text-4xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative group hover:shadow-feature transition-all duration-300 hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-primary shadow-feature bg-gradient-card' 
                  : 'bg-background border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-primary text-primary-foreground px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-bold text-foreground">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button 
                  variant={plan.popular ? "hero" : "outline"} 
                  className="w-full"
                  onClick={() => {
                    if (plan.name === "Enterprise") {
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {plan.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 space-y-4">
          <p className="text-muted-foreground">
            Need a custom solution? We work with enterprises of all sizes.
          </p>
          <Button variant="ghost" className="text-primary hover:text-primary/80">
            Schedule a consultation →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Pricing;