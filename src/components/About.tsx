import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Award, TrendingUp, Shield } from "lucide-react";

const About = () => {
  const stats = [
    {
      icon: Users,
      value: "10,000+",
      label: "Companies Protected",
      description: "From startups to Fortune 500"
    },
    {
      icon: Award,
      value: "95%",
      label: "Accuracy Rate",
      description: "Matching human attorneys"
    },
    {
      icon: TrendingUp,
      value: "$2.5M",
      label: "Average Fines Saved",
      description: "Per company annually"
    },
    {
      icon: Shield,
      value: "50+",
      label: "Violations Prevented",
      description: "Monthly per customer"
    }
  ];

  const team = [
    {
      name: "Sarah Chen",
      role: "CEO & Co-Founder",
      bio: "Former VP of Legal at Stripe. Harvard Law graduate with 15 years in employment law.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&crop=face"
    },
    {
      name: "Marcus Rodriguez", 
      role: "CTO & Co-Founder",
      bio: "Ex-Google AI researcher. PhD in Machine Learning from Stanford, specialized in legal AI.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
    },
    {
      name: "Dr. Amy Williams",
      role: "Head of Compliance",
      bio: "Former DOL Senior Advisor. 20 years ensuring Fortune 500 labor law compliance.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face"
    }
  ];

  return (
    <section id="about" className="py-20 lg:py-32 bg-gradient-feature">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <Badge variant="secondary" className="inline-flex items-center px-4 py-2">
            About ComplyAI
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Built by Compliance <span className="text-primary">Experts</span> for HR Teams
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Founded by legal and AI experts who experienced compliance pain firsthand. 
            We're on a mission to make labor law violations a thing of the past.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <Card key={index} className="group hover:shadow-feature transition-all duration-300 hover:-translate-y-2 bg-background border-border/50">
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center mx-auto group-hover:animate-glow">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {stat.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {stat.description}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Mission Statement */}
        <div className="max-w-4xl mx-auto mb-20">
          <Card className="bg-background border-border/50 p-8 lg:p-12">
            <div className="text-center space-y-6">
              <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
                Our Mission
              </h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Every year, companies pay billions in avoidable labor law fines. Not because they're 
                malicious, but because employment law is complex and constantly changing. We believe 
                AI can solve this problem by making compliance proactive instead of reactive.
              </p>
              <div className="pt-4">
                <div className="inline-flex items-center space-x-2 text-primary font-semibold">
                  <Shield className="w-5 h-5" />
                  <span>Prevention over punishment</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Team */}
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h3 className="text-2xl lg:text-3xl font-bold text-foreground">
              Meet the Team
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Bringing together decades of legal expertise with cutting-edge AI technology.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="group hover:shadow-feature transition-all duration-300 hover:-translate-y-2 bg-background border-border/50">
                <div className="p-8 text-center space-y-6">
                  <div className="relative inline-block">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-24 h-24 rounded-full mx-auto object-cover"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-semibold text-foreground">
                      {member.name}
                    </h4>
                    <p className="text-primary font-medium">
                      {member.role}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {member.bio}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Company Values */}
        <div className="mt-20 pt-16 border-t border-border/20">
          <div className="grid lg:grid-cols-3 gap-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Security First</h4>
              <p className="text-muted-foreground text-sm">
                SOC 2 compliant with enterprise-grade security protecting your sensitive HR data.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Accuracy Obsessed</h4>
              <p className="text-muted-foreground text-sm">
                95% accuracy rate matching human attorneys, with continuous improvement through AI learning.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">Customer Success</h4>
              <p className="text-muted-foreground text-sm">
                Dedicated support team ensuring you get maximum value from our compliance platform.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;