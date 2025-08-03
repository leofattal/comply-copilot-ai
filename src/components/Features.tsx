import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Shield, RefreshCw } from "lucide-react";
import chatbotImage from "@/assets/feature-chatbot.jpg";
import payrollImage from "@/assets/feature-payroll.jpg";
import policyImage from "@/assets/feature-policy.jpg";

const Features = () => {
  const features = [
    {
      icon: MessageCircle,
      title: "Compliance Chatbot",
      description: "Get instant, accurate answers to complex HR questions with legal citations.",
      details: [
        "Natural language queries via Slack/Teams/Web",
        "GPT-4 fine-tuned on DOL/EEOC documentation", 
        "Real-time answers with legal citations",
        "95% accuracy vs human attorneys"
      ],
      image: chatbotImage,
      badge: "AI-Powered"
    },
    {
      icon: Shield,
      title: "Payroll Guardrails", 
      description: "Block violations before they happen with real-time payroll monitoring.",
      details: [
        "Integrates with QuickBooks, ADP, Gusto",
        "Blocks non-compliant payroll runs",
        "Catches overtime violations for exempt employees",
        "Prevents misclassification penalties"
      ],
      image: payrollImage,
      badge: "Prevention"
    },
    {
      icon: RefreshCw,
      title: "Policy Sync",
      description: "Automatically update policies when laws change across all 50 states.",
      details: [
        "Monitors labor law changes in real-time",
        "Auto-updates employee handbooks",
        "Change summaries and impact analysis", 
        "Git-like versioning for policy tracking"
      ],
      image: policyImage,
      badge: "Automated"
    }
  ];

  return (
    <section id="features" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 mb-16">
          <Badge variant="secondary" className="inline-flex items-center px-4 py-2">
            Core Features
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Three Ways We <span className="text-primary">Prevent</span> Violations
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Unlike tools that only alert you after violations occur, ComplyAI actively prevents 
            them before they impact your business.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-feature transition-all duration-300 hover:-translate-y-2 bg-gradient-card border-border/50">
              <div className="p-8 space-y-6">
                {/* Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center group-hover:animate-glow">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>

                {/* Feature Image */}
                <div className="relative overflow-hidden rounded-lg">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {/* Details List */}
                <div className="space-y-3">
                  {feature.details.map((detail, detailIndex) => (
                    <div key={detailIndex} className="flex items-start space-x-3">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-sm text-muted-foreground">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;