import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProjectGallery from '@/components/ProjectGallery';
import AnimatedGears from '@/components/AnimatedGears';

export default function ProjectsPage() {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <section className="relative pt-24 pb-12">
        <ProjectGallery />

        {/* Overlay limited to the section (does not cover footer) */}
        <div role="status" aria-live="polite" className="absolute inset-0 z-40 flex items-center justify-center bg-white/90 pointer-events-auto">
          <div className="text-center px-6 py-4 rounded-md">
            {/* Construction / maintenance icon */}
            <div aria-hidden>
              <AnimatedGears />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">PÁGINA EN CONSTRUCCIÓN</h2>
            <p className="text-lg mt-2 text-gray-700">Esta sección pronto estará disponible.</p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
