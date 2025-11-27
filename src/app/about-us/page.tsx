"use client";
import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const tabs = [
  { label: "Visión", key: "vision" },
  { label: "Misión", key: "mision" },
  { label: "Valores", key: "valores" },
];

export default function AboutUsPage() {
  const [activeTab, setActiveTab] = useState("vision");

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto py-24 px-4 min-h-[60vh] mt-2 md:mt-8 lg:mt-16">
        <div className="flex justify-center mb-16">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-6 py-2 text-lg font-semibold border-b-2 transition-colors duration-200 focus:outline-none ${
                activeTab === tab.key
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-400 hover:text-red-600"
              }`}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
        <section className="border-2 border-gray-100 rounded-lg p-12 bg-white shadow-xs">
          {activeTab === "vision" && (
            <>
              <h2 className="text-5xl font-normal mb-8 text-gray-100 text-right">Visión</h2>
              <p className="text-gray-700">Ser referentes en Chile y en el sector minero, ofreciendo soluciones integrales de ingeniería y construcción que impulsen el desarrollo industrial y urbano, destacando por la excelencia, la innovación y la confianza.</p>
            </>
          )}
          {activeTab === "mision" && (
            <>
              <h2 className="text-5xl font-normal mb-8 text-gray-100 text-right">Misión</h2>
              <p className="text-gray-700">Brindar a nuestros clientes soluciones de calidad de manera eficiente y segura, respetando el medio ambiente y a la comunidad; asegurar a la empresa una rentabilidad sostenible; y ofrecer a nuestros trabajadores oportunidades de desarrollo profesional en un entorno responsable y colaborativo.</p>
            </>
          )}
          {activeTab === "valores" && (
            <>
              <h2 className="text-5xl font-normal mb-8 text-gray-100 text-right">Valores</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li className="font-semibold text-gray-500 text-lg">Integridad</li>
                <p className="text-gray-400 mb-6">Actuamos con transparencia y ética en cada decisión y relación.</p>
                <li className="font-semibold text-gray-500 text-lg">Innovación</li>
                <p className="text-gray-400 mb-6">Impulsamos soluciones modernas que aporten valor al desarrollo minero e industrial-urbano.</p>
                <li className="font-semibold text-gray-500 text-lg">Compromiso</li>
                <p className="text-gray-400 mb-6">Cumplimos con nuestros clientes, colaboradores y entorno, garantizando seriedad y responsabilidad.</p>
                <li className="font-semibold text-gray-500 text-lg">Excelencia</li>
                <p className="text-gray-400 mb-6">Buscamos altos estándares en cada proyecto, priorizando calidad, seguridad y eficiencia.</p>
                <li className="font-semibold text-gray-500 text-lg">Responsabilidad social</li>
                <p className="text-gray-400">Contribuimos al bienestar de las comunidades y al cuidado del medio ambiente en todas nuestras operaciones.</p>
              </ul>
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
