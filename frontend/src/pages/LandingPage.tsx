import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Wand2,
  Calendar,
  Users,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  CheckCircle,
  BookOpen,
  DoorOpen,
  Check,
  Menu,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

const features = [
  { icon: Wand2, title: "Auto-Generate Schedules", description: "Our smart algorithm creates conflict-free timetables in seconds, considering all constraints." },
  { icon: Users, title: "Teacher Management", description: "Manage staff availability, subject assignments, and workload distribution effortlessly." },
  { icon: Calendar, title: "Multiple Views", description: "View schedules by class, teacher, or room with an intuitive weekly grid layout." },
  { icon: Shield, title: "Role-Based Access", description: "Admins and teachers get tailored dashboards with appropriate permissions." },
  { icon: Zap, title: "Real-Time Updates", description: "Changes propagate instantly. Regenerate timetables on the fly when constraints change." },
  { icon: Clock, title: "Export & Print", description: "Download schedules as PDF or print them directly for notice boards and distribution." },
];

const stats = [
  { value: "10x", label: "Faster scheduling" },
  { value: "0", label: "Conflicts guaranteed" },
  { value: "100%", label: "Constraint coverage" },
  { value: "24/7", label: "Cloud access" },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out UniSchedule",
    features: ["Up to 5 teachers", "Up to 3 rooms", "Basic timetable generation", "Weekly grid view", "Email support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For departments and small colleges",
    features: ["Unlimited teachers", "Unlimited rooms", "Advanced conflict resolution", "PDF & print export", "Multi-view (class/teacher/room)", "Priority support", "Dark mode"],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For large universities with multiple departments",
    features: ["Everything in Pro", "Multi-department support", "Custom constraints & rules", "API access", "SSO authentication", "Dedicated account manager", "SLA guarantee"],
    cta: "Contact Sales",
    popular: false,
  },
];

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#stats", label: "Why Us" },
];

const LandingPage = () => {
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    const sections = navLinks.map((l) => l.href.slice(1));
    const offset = 120;
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(sections[i]);
      if (el && el.getBoundingClientRect().top <= offset) {
        setActiveSection(sections[i]);
        return;
      }
    }
    setActiveSection("");
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen scroll-smooth bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-foreground">UniSchedule</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => scrollTo(e, link.href.slice(1))}
                className={cn(
                  "relative text-sm font-medium transition-colors",
                  activeSection === link.href.slice(1)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {link.label}
                {activeSection === link.href.slice(1) && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-[1.19rem] left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-border/50 bg-background md:hidden"
            >
              <nav className="flex flex-col gap-1 px-6 py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => scrollTo(e, link.href.slice(1))}
                    className={cn(
                      "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      activeSection === link.href.slice(1)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                  <Button variant="outline" asChild className="w-full">
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link to="/register">Get Started</Link>
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 lg:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div {...fade()}>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
                <Zap className="h-3 w-3" /> Intelligent Scheduling
              </span>
            </motion.div>
            <motion.h1 {...fade(0.1)} className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Smart Timetables,{" "}
              <span className="text-primary">Zero Conflicts</span>
            </motion.h1>
            <motion.p {...fade(0.2)} className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Generate optimized, conflict-free university schedules in seconds.
              Manage teachers, rooms, and subjects — all from one dashboard.
            </motion.p>
            <motion.div {...fade(0.3)} className="mt-8 flex items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/register">Start Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features" onClick={(e) => scrollTo(e, "features")}>See Features</a>
              </Button>
            </motion.div>
          </div>

          {/* Preview Mockup */}
          <motion.div {...fade(0.4)} className="mx-auto mt-16 max-w-4xl">
            <div className="rounded-xl border border-border bg-card p-1.5 card-shadow-lg">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <span className="ml-3 text-xs text-muted-foreground">UniSchedule — Dashboard</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { icon: Users, label: "Teachers", value: "24" },
                    { icon: BookOpen, label: "Subjects", value: "38" },
                    { icon: DoorOpen, label: "Rooms", value: "16" },
                    { icon: Calendar, label: "Classes", value: "12" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-card p-4 card-shadow">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <s.icon className="h-4 w-4" />
                        <span className="text-xs font-medium">{s.label}</span>
                      </div>
                      <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
                    <div key={d} className="space-y-1.5">
                      <p className="text-center text-xs font-medium text-muted-foreground">{d}</p>
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="h-8 rounded-md bg-primary/10" style={{ opacity: 0.5 + n * 0.15 }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="scroll-mt-20 border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-14 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} {...fade(i * 0.08)} className="text-center">
              <p className="text-3xl font-extrabold text-primary">{s.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div {...fade()} className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Everything you need to schedule smarter</h2>
            <p className="mt-3 text-muted-foreground">Powerful tools designed for university administrators and department heads.</p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div key={f.title} {...fade(i * 0.06)} className="group rounded-xl border border-border bg-card p-6 card-shadow transition-shadow hover:card-shadow-hover">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div {...fade()} className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Get started in three steps</h2>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "Add Your Data", desc: "Enter teachers, subjects, rooms, and class sections into the system." },
              { step: "02", title: "Generate Schedule", desc: "Click generate and let the algorithm create an optimized, conflict-free timetable." },
              { step: "03", title: "Review & Export", desc: "View by class, teacher, or room. Export to PDF or print for distribution." },
            ].map((s, i) => (
              <motion.div key={s.step} {...fade(i * 0.1)} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {s.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div {...fade()} className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground">Simple, transparent pricing</h2>
            <p className="mt-3 text-muted-foreground">Choose the plan that fits your institution. Upgrade or downgrade anytime.</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                {...fade(i * 0.1)}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-8 transition-shadow",
                  plan.popular
                    ? "border-primary bg-card card-shadow-lg scale-[1.02]"
                    : "border-border bg-card card-shadow hover:card-shadow-hover"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link to="/register">{plan.cta}</Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div {...fade()} className="rounded-2xl bg-primary px-8 py-16 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground">Ready to simplify your scheduling?</h2>
            <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
              Join universities already using UniSchedule to eliminate timetable conflicts and save hours of manual work.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/register">Get Started Free <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" />Free to start</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" />No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4" />Cancel anytime</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">UniSchedule</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 UniSchedule. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
