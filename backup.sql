


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."clean_expired_reset_tokens"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    DELETE FROM public.fasercon_password_reset_tokens 
    WHERE expires_at < NOW() OR used = true;
END;
$$;


ALTER FUNCTION "public"."clean_expired_reset_tokens"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."fasercon_contact_forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(50) NOT NULL,
    "message" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "notes" "text",
    CONSTRAINT "fasercon_contact_forms_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'REVIEWED'::character varying, 'CONTACTED'::character varying, 'CLOSED'::character varying])::"text"[])))
);


ALTER TABLE "public"."fasercon_contact_forms" OWNER TO "postgres";


COMMENT ON TABLE "public"."fasercon_contact_forms" IS 'Tabla para almacenar formularios de contacto del sitio web de Fasercon';



COMMENT ON COLUMN "public"."fasercon_contact_forms"."status" IS 'Estado del formulario: PENDING, REVIEWED, CONTACTED, CLOSED';



COMMENT ON COLUMN "public"."fasercon_contact_forms"."notes" IS 'Notas internas para seguimiento del contacto';



CREATE TABLE IF NOT EXISTS "public"."fasercon_password_reset_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."fasercon_password_reset_tokens" OWNER TO "postgres";


COMMENT ON TABLE "public"."fasercon_password_reset_tokens" IS 'Tokens para reset de contraseña de usuarios';



COMMENT ON COLUMN "public"."fasercon_password_reset_tokens"."token" IS 'Token único para validar el reset de contraseña';



COMMENT ON COLUMN "public"."fasercon_password_reset_tokens"."expires_at" IS 'Fecha y hora de expiración del token (24 horas)';



COMMENT ON COLUMN "public"."fasercon_password_reset_tokens"."used" IS 'Marca si el token ya fue utilizado';



CREATE TABLE IF NOT EXISTS "public"."fasercon_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text"[],
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "applications" "jsonb" DEFAULT '[]'::"jsonb",
    "price" numeric(12,2),
    "visible" boolean DEFAULT true,
    "order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "measurement_unit" "text",
    "unit_size" numeric,
    "measurement_type" "text",
    "stock" integer,
    "characteristics" "jsonb",
    "sku" "text",
    "supplier_id" "uuid",
    "manufacturer" "text",
    CONSTRAINT "sku_digits_only" CHECK ((("sku" IS NULL) OR ("sku" ~ '^[0-9]+$'::"text")))
);


ALTER TABLE "public"."fasercon_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fasercon_quote_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "quote_id" "uuid",
    "product_id" "uuid",
    "name" "text",
    "image_url" "text",
    "unit_size" "text",
    "measurement_unit" "text",
    "qty" integer,
    "price" numeric,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "company" "text",
    "email" "text",
    "phone" "text",
    "document" "text"
);


ALTER TABLE "public"."fasercon_quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fasercon_quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(50) NOT NULL,
    "width" numeric(10,2) NOT NULL,
    "length" numeric(10,2) NOT NULL,
    "area" numeric(10,2) NOT NULL,
    "material_type" character varying(100) NOT NULL,
    "estimated_price" numeric(12,2) DEFAULT 0 NOT NULL,
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "quote_number" character varying(32),
    CONSTRAINT "fasercon_quotes_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['PENDING'::character varying, 'REVIEWED'::character varying, 'QUOTED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::"text"[])))
);


ALTER TABLE "public"."fasercon_quotes" OWNER TO "postgres";


COMMENT ON TABLE "public"."fasercon_quotes" IS 'Tabla para almacenar cotizaciones del sitio web de Fasercon';



COMMENT ON COLUMN "public"."fasercon_quotes"."material_type" IS 'Tipo de material seleccionado para la cotización';



COMMENT ON COLUMN "public"."fasercon_quotes"."estimated_price" IS 'Precio estimado inicial de la cotización';



COMMENT ON COLUMN "public"."fasercon_quotes"."status" IS 'Estado de la cotización: PENDING, REVIEWED, QUOTED, APPROVED, REJECTED';



COMMENT ON COLUMN "public"."fasercon_quotes"."admin_notes" IS 'Notas internas del administrador sobre la cotización';



CREATE TABLE IF NOT EXISTS "public"."fasercon_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "images" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fasercon_services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fasercon_suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_info" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "address" "text",
    "country" "text",
    "phone" "text",
    "website" "text"
);


ALTER TABLE "public"."fasercon_suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fasercon_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "password" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "role" character varying(50) DEFAULT 'USER'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "last_login" timestamp with time zone,
    "last_name" character varying(255) DEFAULT 'Sin Apellido'::character varying NOT NULL,
    "phone" character varying(20),
    "screens" "text"[] DEFAULT '{}'::"text"[],
    CONSTRAINT "fasercon_users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('user'::character varying)::"text", ('manager'::character varying)::"text", ('dev'::character varying)::"text"])))
);


ALTER TABLE "public"."fasercon_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."fasercon_users" IS 'Tabla de usuarios del sistema Fasercon';



COMMENT ON COLUMN "public"."fasercon_users"."role" IS 'Rol del usuario: ADMIN, USER, MANAGER';



COMMENT ON COLUMN "public"."fasercon_users"."is_active" IS 'Indica si el usuario está activo en el sistema';



COMMENT ON COLUMN "public"."fasercon_users"."screens" IS 'Array of screen names that the user has access to (only for user role)';



ALTER TABLE ONLY "public"."fasercon_contact_forms"
    ADD CONSTRAINT "fasercon_contact_forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_password_reset_tokens"
    ADD CONSTRAINT "fasercon_password_reset_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_password_reset_tokens"
    ADD CONSTRAINT "fasercon_password_reset_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."fasercon_products"
    ADD CONSTRAINT "fasercon_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_quote_items"
    ADD CONSTRAINT "fasercon_quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_quotes"
    ADD CONSTRAINT "fasercon_quotes_correlativo_key" UNIQUE ("quote_number");



ALTER TABLE ONLY "public"."fasercon_quotes"
    ADD CONSTRAINT "fasercon_quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_services"
    ADD CONSTRAINT "fasercon_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_suppliers"
    ADD CONSTRAINT "fasercon_suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fasercon_users"
    ADD CONSTRAINT "fasercon_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."fasercon_users"
    ADD CONSTRAINT "fasercon_users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_fasercon_contact_forms_created_at" ON "public"."fasercon_contact_forms" USING "btree" ("created_at");



CREATE INDEX "idx_fasercon_contact_forms_email" ON "public"."fasercon_contact_forms" USING "btree" ("email");



CREATE INDEX "idx_fasercon_contact_forms_status" ON "public"."fasercon_contact_forms" USING "btree" ("status");



CREATE INDEX "idx_fasercon_password_reset_tokens_expires_at" ON "public"."fasercon_password_reset_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_fasercon_password_reset_tokens_token" ON "public"."fasercon_password_reset_tokens" USING "btree" ("token");



CREATE INDEX "idx_fasercon_password_reset_tokens_user_id" ON "public"."fasercon_password_reset_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_fasercon_products_name" ON "public"."fasercon_products" USING "gin" ("to_tsvector"('"spanish"'::"regconfig", COALESCE("name", ''::"text")));



CREATE INDEX "idx_fasercon_products_order" ON "public"."fasercon_products" USING "btree" ("order");



CREATE INDEX "idx_fasercon_products_supplier_id" ON "public"."fasercon_products" USING "btree" ("supplier_id");



CREATE INDEX "idx_fasercon_quotes_created_at" ON "public"."fasercon_quotes" USING "btree" ("created_at");



CREATE INDEX "idx_fasercon_quotes_email" ON "public"."fasercon_quotes" USING "btree" ("email");



CREATE INDEX "idx_fasercon_quotes_material_type" ON "public"."fasercon_quotes" USING "btree" ("material_type");



CREATE INDEX "idx_fasercon_quotes_status" ON "public"."fasercon_quotes" USING "btree" ("status");



CREATE INDEX "idx_fasercon_suppliers_email" ON "public"."fasercon_suppliers" USING "btree" ("lower"("email"));



CREATE UNIQUE INDEX "idx_fasercon_suppliers_name" ON "public"."fasercon_suppliers" USING "btree" ("lower"("name"));



CREATE INDEX "idx_fasercon_suppliers_phone" ON "public"."fasercon_suppliers" USING "btree" ("lower"("phone"));



CREATE INDEX "idx_fasercon_users_email" ON "public"."fasercon_users" USING "btree" ("email");



CREATE INDEX "idx_fasercon_users_is_active" ON "public"."fasercon_users" USING "btree" ("is_active");



CREATE INDEX "idx_fasercon_users_role" ON "public"."fasercon_users" USING "btree" ("role");



CREATE INDEX "idx_fq_created_at" ON "public"."fasercon_quotes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fqi_quote_id" ON "public"."fasercon_quote_items" USING "btree" ("quote_id");



CREATE UNIQUE INDEX "unique_sku" ON "public"."fasercon_products" USING "btree" ("sku") WHERE ("sku" IS NOT NULL);



CREATE UNIQUE INDEX "ux_fasercon_products_sku" ON "public"."fasercon_products" USING "btree" ("sku") WHERE ("sku" IS NOT NULL);



CREATE OR REPLACE TRIGGER "trg_set_updated_at" BEFORE UPDATE ON "public"."fasercon_products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_fasercon_contact_forms_updated_at" BEFORE UPDATE ON "public"."fasercon_contact_forms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fasercon_quotes_updated_at" BEFORE UPDATE ON "public"."fasercon_quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fasercon_users_updated_at" BEFORE UPDATE ON "public"."fasercon_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."fasercon_password_reset_tokens"
    ADD CONSTRAINT "fasercon_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."fasercon_users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fasercon_products"
    ADD CONSTRAINT "fasercon_products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."fasercon_suppliers"("id");



ALTER TABLE ONLY "public"."fasercon_quote_items"
    ADD CONSTRAINT "fasercon_quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."fasercon_products"("id");



ALTER TABLE ONLY "public"."fasercon_quote_items"
    ADD CONSTRAINT "fasercon_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."fasercon_quotes"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all updates" ON "public"."fasercon_users" FOR UPDATE USING (true);



CREATE POLICY "Allow anonymous insert" ON "public"."fasercon_quotes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable admin access" ON "public"."fasercon_users" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN'::"text"));



CREATE POLICY "Enable insert for anonymous users" ON "public"."fasercon_contact_forms" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Enable read for authenticated users" ON "public"."fasercon_contact_forms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read for authentication" ON "public"."fasercon_users" FOR SELECT USING (true);



CREATE POLICY "Permitir actualizar cotizaciones a usuarios autenticados" ON "public"."fasercon_quotes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Permitir actualizar tokens de reset" ON "public"."fasercon_password_reset_tokens" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Permitir insertar cotizaciones" ON "public"."fasercon_quotes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Permitir insertar tokens de reset" ON "public"."fasercon_password_reset_tokens" FOR INSERT WITH CHECK (true);



CREATE POLICY "Permitir leer cotizaciones a usuarios autenticados" ON "public"."fasercon_quotes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Permitir leer tokens de reset" ON "public"."fasercon_password_reset_tokens" FOR SELECT USING (true);



ALTER TABLE "public"."fasercon_contact_forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fasercon_password_reset_tokens" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "insert_policy" ON "public"."fasercon_users" FOR INSERT WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_contact_forms";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_password_reset_tokens";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_products";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_quote_items";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_quotes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_services";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."fasercon_users";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."clean_expired_reset_tokens"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_reset_tokens"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_reset_tokens"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."fasercon_contact_forms" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_contact_forms" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_contact_forms" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_password_reset_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_password_reset_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_password_reset_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_products" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_products" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_products" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_quote_items" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_quotes" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_quotes" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_services" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_services" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_services" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_suppliers" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."fasercon_users" TO "anon";
GRANT ALL ON TABLE "public"."fasercon_users" TO "authenticated";
GRANT ALL ON TABLE "public"."fasercon_users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































