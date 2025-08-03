import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, Calculator, ArrowRight } from "lucide-react";

const Solutions = () => {
  const solutions = [
    {
      icon: Users,
      title: "HR Managers",
      subtitle: "Stop playing compliance defense",
      painPoints: [
        "Manual compliance research takes hours",
        "Fear of missing law changes",
        "Constant worry about payroll errors",
        "No expert guidance on complex cases"
      ],
      benefits: [
        "Instant answers to any HR question",
        "Automatic policy updates",
        "Pre-payroll violation blocking",
        "AI legal expertise on-demand"
      ],
      cta: "Protect Your HR Team"
    },
    {
      icon: Briefcase,
      title: "Startup Founders", 
      subtitle: "Scale without compliance risk",
      painPoints: [
        "Can't afford dedicated legal staff",
        "Unintentional violations due to ignorance",
        "Manual processes don't scale",
        "Expensive legal consultations"
      ],
      benefits: [
        "AI legal team in your pocket",
        "Prevent costly violations early",
        "Automated compliance scaling", 
        "Fraction of attorney costs"
      ],
      cta: "Scale Safely"
    },
    {
      icon: Calculator,
      title: "Payroll Teams",
      subtitle: "Sleep better at night",
      painPoints: [
        "Fear of classification mistakes",
        "Overtime calculation errors",
        "State law complexity",
        "Risk of DOL audits"
      ],
      benefits: [
        "Real-time payroll validation",
        "Automatic overtime compliance",
        "50-state law coverage",
        "Audit-ready documentation"
      ],
      cta: "Secure Your Payroll"
    }
  ];

  return (
    <section id="solutions" className="py-20 lg:py-32 bg-gradient-feature">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 mb-16">
          <Badge variant="secondary" className="inline-flex items-center px-4 py-2">
            Target Solutions
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Built for Your <span className="text-primary">Specific</span> Pain Points
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Different roles face different compliance challenges. ComplyAI addresses 
            the unique needs of each stakeholder in your organization.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {solutions.map((solution, index) => (
            <Card key={index} className="group hover:shadow-feature transition-all duration-300 hover:-translate-y-2 bg-background border-border/50">
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                  <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center group-hover:animate-glow">
                    <solution.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {solution.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {solution.subtitle}
                    </p>
                  </div>
                </div>

                {/* Pain Points */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-destructive uppercase tracking-wide">
                    Current Pain Points
                  </h4>
                  <div className="space-y-2">
                    {solution.painPoints.map((pain, painIndex) => (
                      <div key={painIndex} className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground">{pain}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-accent uppercase tracking-wide">
                    How ComplyAI Helps
                  </h4>
                  <div className="space-y-2">
                    {solution.benefits.map((benefit, benefitIndex) => (
                      <div key={benefitIndex} className="flex items-start space-x-3">
                        <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-sm text-muted-foreground">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <Button 
                  variant="hero" 
                  className="w-full group"
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {solution.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Solutions;