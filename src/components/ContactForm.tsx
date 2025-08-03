import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import { submitContactForm, simulateApiCall } from "@/lib/api";
import type { ContactFormData } from "@/lib/api";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    employees: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Track form submission attempt
      analytics.trackFormSubmit('contact_form');

      // For development, use simulated API call
      // In production, replace with: await submitContactForm(formData);
      await simulateApiCall(formData);

      toast({
        title: "Message sent successfully!",
        description: "We'll get back to you within 24 hours.",
        duration: 5000,
      });

      // Track successful submission
      analytics.trackEvent({
        action: 'form_submit_success',
        category: 'conversion',
        label: 'contact_form',
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        company: "",
        employees: "",
        message: ""
      });
    } catch (error) {
      // Track form submission error
      analytics.trackEvent({
        action: 'form_submit_error',
        category: 'error',
        label: 'contact_form',
      });

      toast({
        title: "Failed to send message",
        description: "Please try again or contact us directly.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <section id="contact" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <Badge variant="secondary" className="inline-flex items-center px-4 py-2">
            Get Started
          </Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground">
            Ready to <span className="text-primary">Prevent</span> Violations?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Schedule a demo or start your free trial today. Our compliance experts are ready to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Contact Form */}
          <Card className="p-8 bg-gradient-card border-border/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground">
                  Start Your Free Trial
                </h3>
                <p className="text-muted-foreground">
                  Get immediate access to our compliance platform with a 14-day free trial.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground">
                    Work Email *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    className="bg-background/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium text-foreground">
                    Company Name *
                  </label>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    required
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Acme Inc."
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="employees" className="text-sm font-medium text-foreground">
                    Number of Employees
                  </label>
                  <select
                    id="employees"
                    name="employees"
                    value={formData.employees}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select range</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-1000">201-1000</option>
                    <option value="1000+">1000+</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-foreground">
                  Tell us about your compliance needs
                </label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="What compliance challenges are you facing?"
                  className="bg-background/50 min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full"
                variant="hero"
              >
                {isSubmitting ? "Sending..." : "Start Free Trial"}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                By submitting this form, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>{" "}
                and{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>.
              </div>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold text-foreground">
                Other Ways to Reach Us
              </h3>
              <p className="text-muted-foreground">
                Prefer to talk? Our compliance experts are standing by to help.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground">Email Us</h4>
                  <p className="text-muted-foreground">hello@complyai.com</p>
                  <p className="text-sm text-muted-foreground">We respond within 2 hours</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground">Call Us</h4>
                  <p className="text-muted-foreground">+1 (555) 123-4567</p>
                  <p className="text-sm text-muted-foreground">Mon-Fri 9AM-6PM EST</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground">Visit Us</h4>
                  <p className="text-muted-foreground">
                    123 Legal District<br />
                    San Francisco, CA 94105
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Signals */}
            <Card className="p-6 bg-gradient-feature border-border/50">
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Why Companies Trust Us</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-sm text-muted-foreground">SOC 2 Type II Certified</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-sm text-muted-foreground">99.9% Uptime SLA</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-sm text-muted-foreground">Enterprise-grade security</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent" />
                    <span className="text-sm text-muted-foreground">No long-term contracts</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;