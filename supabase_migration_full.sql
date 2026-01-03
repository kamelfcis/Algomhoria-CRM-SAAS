CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('post-thumbnails', 'post-thumbnails', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('post-covers', 'post-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('post-gallery', 'post-gallery', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('site-assets', 'site-assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
  ('authors', 'authors', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('property-images', 'property-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for post-thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-thumbnails');

CREATE POLICY "Public read access for post-covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-covers');

CREATE POLICY "Public read access for post-gallery"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-gallery');

CREATE POLICY "Public read access for site-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

CREATE POLICY "Public read access for authors"
ON storage.objects FOR SELECT
USING (bucket_id = 'authors');

CREATE POLICY "Public read access for property-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Authenticated write access for post-thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for post-covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for post-gallery"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for site-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for authors"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'authors' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated write access for property-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for post-thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'post-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for post-covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'post-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for post-gallery"
ON storage.objects FOR UPDATE
USING (bucket_id = 'post-gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for site-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for authors"
ON storage.objects FOR UPDATE
USING (bucket_id = 'authors' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated update access for property-images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access for post-thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-thumbnails' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access for post-covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-covers' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access for post-gallery"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-gallery' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access for site-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access for authors"
ON storage.objects FOR DELETE
USING (bucket_id = 'authors' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete access for property-images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'moderator', 'sales', 'user')),
  author_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE TABLE IF NOT EXISTS team_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_ar TEXT,
  position TEXT NOT NULL,
  poition_ar TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_users_status ON team_users(status);
CREATE INDEX IF NOT EXISTS idx_team_users_order ON team_users(order_index);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  meta_title_ar TEXT,
  meta_title_en TEXT,
  meta_description_ar TEXT,
  meta_description_en TEXT,
  meta_keywords_ar TEXT,
  meta_keywords_en TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(order_index);
CREATE INDEX IF NOT EXISTS idx_categories_title_en ON categories(title_en);
CREATE INDEX IF NOT EXISTS idx_categories_title_ar ON categories(title_ar);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  excerpt_ar TEXT,
  excerpt_en TEXT,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  meta_title_ar TEXT,
  meta_title_en TEXT,
  meta_description_ar TEXT,
  meta_description_en TEXT,
  meta_keywords_ar TEXT,
  meta_keywords_en TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  cover_url TEXT,
  is_breaking_news BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'inactive')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_is_breaking_news ON posts(is_breaking_news);
CREATE INDEX IF NOT EXISTS idx_posts_is_featured ON posts(is_featured);
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts(published_at);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_title_en ON posts(title_en);
CREATE INDEX IF NOT EXISTS idx_posts_title_ar ON posts(title_ar);
CREATE INDEX IF NOT EXISTS idx_posts_content_en_search ON posts USING gin(to_tsvector('english', content_en));
CREATE INDEX IF NOT EXISTS idx_posts_content_ar_search ON posts USING gin(to_tsvector('arabic', content_ar));

CREATE TABLE IF NOT EXISTS post_gallery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text_ar TEXT,
  alt_text_en TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_gallery_post_id ON post_gallery(post_id);
CREATE INDEX IF NOT EXISTS idx_post_gallery_order ON post_gallery(order_index);

CREATE TABLE IF NOT EXISTS sliders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar TEXT,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sliders_status ON sliders(status);
CREATE INDEX IF NOT EXISTS idx_sliders_order ON sliders(order_index);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  value_json JSONB,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

INSERT INTO settings (key, value, description) VALUES
  ('site_name_ar', 'موقع الأخبار', 'Site name in Arabic'),
  ('site_name_en', 'News Website', 'Site name in English'),
  ('site_description_ar', 'موقع إخباري شامل', 'Site description in Arabic'),
  ('site_description_en', 'Comprehensive news website', 'Site description in English'),
  ('logo_url', '', 'Main site logo URL (references site-assets bucket)'),
  ('favicon_url', '', 'Favicon URL (references site-assets bucket)'),
  ('contact_email', '', 'Contact email address'),
  ('contact_phone', '', 'Contact phone number'),
  ('facebook_url', '', 'Facebook page URL'),
  ('twitter_url', '', 'Twitter profile URL'),
  ('instagram_url', '', 'Instagram profile URL'),
  ('youtube_url', '', 'YouTube channel URL'),
  ('linkedin_url', '', 'LinkedIn profile URL')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS project_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_categories_status ON project_categories(status);
CREATE INDEX IF NOT EXISTS idx_project_categories_order ON project_categories(order_index);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  category_id UUID REFERENCES project_categories(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_order ON projects(order_index);
CREATE INDEX IF NOT EXISTS idx_projects_category_id ON projects(category_id);

CREATE TABLE IF NOT EXISTS governorates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_governorates_status ON governorates(status);
CREATE INDEX IF NOT EXISTS idx_governorates_order ON governorates(order_index);

CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  governorate_id UUID NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_areas_governorate_id ON areas(governorate_id);
CREATE INDEX IF NOT EXISTS idx_areas_status ON areas(status);
CREATE INDEX IF NOT EXISTS idx_areas_order ON areas(order_index);

CREATE TABLE IF NOT EXISTS streets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streets_area_id ON streets(area_id);
CREATE INDEX IF NOT EXISTS idx_streets_status ON streets(status);
CREATE INDEX IF NOT EXISTS idx_streets_order ON streets(order_index);

CREATE TABLE IF NOT EXISTS property_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  login_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_owners_phone ON property_owners(phone_number);
CREATE INDEX IF NOT EXISTS idx_property_owners_email ON property_owners(email);
CREATE INDEX IF NOT EXISTS idx_property_owners_name ON property_owners(name);
CREATE INDEX IF NOT EXISTS idx_property_owners_status ON property_owners(status);

CREATE TABLE IF NOT EXISTS property_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_types_status ON property_types(status);

CREATE TABLE IF NOT EXISTS property_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_facilities_status ON property_facilities(status);

CREATE TABLE IF NOT EXISTS property_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_services_status ON property_services(status);

CREATE TABLE IF NOT EXISTS property_view_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_view_types_status ON property_view_types(status);

CREATE TABLE IF NOT EXISTS property_finishing_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_finishing_types_status ON property_finishing_types(status);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  old_code TEXT,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  address_ar TEXT,
  address_en TEXT,
  governorate_id UUID REFERENCES governorates(id) ON DELETE SET NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  street_id UUID REFERENCES streets(id) ON DELETE SET NULL,
  location_text TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  owner_id UUID REFERENCES property_owners(id) ON DELETE SET NULL,
  section_id UUID REFERENCES sections(id) ON DELETE SET NULL,
  property_type_id UUID REFERENCES property_types(id) ON DELETE SET NULL,
  price DECIMAL(15, 2),
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  size DECIMAL(10, 2),
  baths INTEGER,
  floor_no INTEGER,
  view_type_id UUID REFERENCES property_view_types(id) ON DELETE SET NULL,
  finishing_type_id UUID REFERENCES property_finishing_types(id) ON DELETE SET NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'rejected', 'deleted', 'expired', 'rented', 'sold')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_rented BOOLEAN NOT NULL DEFAULT FALSE,
  is_sold BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(code);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_type_id ON properties(property_type_id);
CREATE INDEX IF NOT EXISTS idx_properties_governorate_id ON properties(governorate_id);
CREATE INDEX IF NOT EXISTS idx_properties_area_id ON properties(area_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_featured ON properties(is_featured);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);
CREATE INDEX IF NOT EXISTS idx_properties_created_by ON properties(created_by);
CREATE INDEX IF NOT EXISTS idx_properties_title_ar ON properties(title_ar);
CREATE INDEX IF NOT EXISTS idx_properties_title_en ON properties(title_en);

CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text_ar TEXT,
  alt_text_en TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_order ON property_images(order_index);
CREATE INDEX IF NOT EXISTS idx_property_images_is_primary ON property_images(is_primary);

CREATE TABLE IF NOT EXISTS property_property_facilities (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES property_facilities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_property_facilities_property_id ON property_property_facilities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_facilities_facility_id ON property_property_facilities(facility_id);

CREATE TABLE IF NOT EXISTS property_property_services (
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES property_services(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_property_services_property_id ON property_property_services(property_id);
CREATE INDEX IF NOT EXISTS idx_property_services_service_id ON property_property_services(service_id);

CREATE TABLE IF NOT EXISTS property_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  booking_from_date DATE NOT NULL,
  booking_to_date DATE NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_bookings_property_id ON property_bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_property_bookings_status ON property_bookings(status);
CREATE INDEX IF NOT EXISTS idx_property_bookings_from_date ON property_bookings(booking_from_date);
CREATE INDEX IF NOT EXISTS idx_property_bookings_to_date ON property_bookings(booking_to_date);
CREATE INDEX IF NOT EXISTS idx_property_bookings_created_at ON property_bookings(created_at);

CREATE TABLE IF NOT EXISTS featured_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  governorate_id UUID NOT NULL REFERENCES governorates(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  projects_order JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_featured_areas_governorate_id ON featured_areas(governorate_id);
CREATE INDEX IF NOT EXISTS idx_featured_areas_area_id ON featured_areas(area_id);
CREATE INDEX IF NOT EXISTS idx_featured_areas_status ON featured_areas(status);
CREATE INDEX IF NOT EXISTS idx_featured_areas_order ON featured_areas(order_index);

CREATE TABLE IF NOT EXISTS property_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_comments_property_id ON property_comments(property_id);
CREATE INDEX IF NOT EXISTS idx_property_comments_status ON property_comments(status);
CREATE INDEX IF NOT EXISTS idx_property_comments_created_at ON property_comments(created_at);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'inquiry', 'complaint')),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_title TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'handled', 'archived')),
  handled_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  property_owner_id UUID REFERENCES property_owners(id) ON DELETE SET NULL,
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_type ON leads(type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_entity ON leads(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_property_owner_id ON leads(property_owner_id);

CREATE TABLE IF NOT EXISTS direct_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  message TEXT,
  source TEXT,
  property_owner_id UUID REFERENCES property_owners(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_direct_leads_status ON direct_leads(status);
CREATE INDEX IF NOT EXISTS idx_direct_leads_priority ON direct_leads(priority);
CREATE INDEX IF NOT EXISTS idx_direct_leads_property_owner_id ON direct_leads(property_owner_id);
CREATE INDEX IF NOT EXISTS idx_direct_leads_assigned_to ON direct_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_direct_leads_created_at ON direct_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_direct_leads_phone_number ON direct_leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_direct_leads_email ON direct_leads(email);


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_users_updated_at BEFORE UPDATE ON team_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_gallery_updated_at BEFORE UPDATE ON post_gallery
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sliders_updated_at BEFORE UPDATE ON sliders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_categories_updated_at BEFORE UPDATE ON project_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_governorates_updated_at BEFORE UPDATE ON governorates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streets_updated_at BEFORE UPDATE ON streets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_owners_updated_at BEFORE UPDATE ON property_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_types_updated_at BEFORE UPDATE ON property_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_facilities_updated_at BEFORE UPDATE ON property_facilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_services_updated_at BEFORE UPDATE ON property_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_view_types_updated_at BEFORE UPDATE ON property_view_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_finishing_types_updated_at BEFORE UPDATE ON property_finishing_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_images_updated_at BEFORE UPDATE ON property_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_bookings_updated_at BEFORE UPDATE ON property_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_areas_updated_at BEFORE UPDATE ON featured_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_comments_updated_at BEFORE UPDATE ON property_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_direct_leads_updated_at BEFORE UPDATE ON direct_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE sliders ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE streets ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_view_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_finishing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_property_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_property_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "users_select_all_admin" ON users FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_insert_admin" ON users FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_update_own" ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_all_admin" ON users FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "users_delete_admin" ON users FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "team_users_select_public" ON team_users FOR SELECT
USING (status = 'active');

CREATE POLICY "team_users_select_all_admin" ON team_users FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "team_users_insert_admin" ON team_users FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "team_users_update_admin" ON team_users FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "team_users_delete_admin" ON team_users FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "categories_select_public" ON categories FOR SELECT
USING (status = 'active');

CREATE POLICY "categories_select_all_moderator" ON categories FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "categories_insert_admin" ON categories FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "categories_update_moderator" ON categories FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "categories_delete_admin" ON categories FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "posts_select_public" ON posts FOR SELECT
USING (status = 'active');

CREATE POLICY "posts_select_all_moderator" ON posts FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "posts_insert_sales" ON posts FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "posts_update_moderator" ON posts FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "posts_delete_admin" ON posts FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "post_gallery_select_public" ON post_gallery FOR SELECT
USING (EXISTS(SELECT 1 FROM posts WHERE posts.id = post_gallery.post_id AND posts.status = 'active'));

CREATE POLICY "post_gallery_select_all_moderator" ON post_gallery FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "post_gallery_insert_sales" ON post_gallery FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "post_gallery_update_moderator" ON post_gallery FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "post_gallery_delete_admin" ON post_gallery FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "sliders_select_public" ON sliders FOR SELECT
USING (status = 'active');

CREATE POLICY "sliders_select_all_moderator" ON sliders FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "sliders_insert_admin" ON sliders FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "sliders_update_moderator" ON sliders FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "sliders_delete_admin" ON sliders FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "newsletter_subscribers_insert_public" ON newsletter_subscribers FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "newsletter_subscribers_select_own" ON newsletter_subscribers FOR SELECT
TO authenticated, anon
USING (email = COALESCE(auth.jwt() ->> 'email', ''));

CREATE POLICY "newsletter_subscribers_select_all_admin" ON newsletter_subscribers FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "newsletter_subscribers_update_own" ON newsletter_subscribers FOR UPDATE
TO authenticated, anon
USING (email = COALESCE(auth.jwt() ->> 'email', ''))
WITH CHECK (email = COALESCE(auth.jwt() ->> 'email', ''));

CREATE POLICY "newsletter_subscribers_delete_admin" ON newsletter_subscribers FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "leads_insert_public" ON leads FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "leads_select_sales" ON leads FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "leads_update_moderator" ON leads FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "leads_delete_admin" ON leads FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "settings_select_public" ON settings FOR SELECT
USING (true);

CREATE POLICY "settings_insert_admin" ON settings FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "settings_update_admin" ON settings FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "settings_delete_admin" ON settings FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "projects_select_public" ON projects FOR SELECT
USING (status = 'active');

CREATE POLICY "projects_select_all_moderator" ON projects FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "projects_insert_admin" ON projects FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "projects_update_moderator" ON projects FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "projects_delete_admin" ON projects FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "project_categories_select_public" ON project_categories FOR SELECT
USING (status = 'active');

CREATE POLICY "project_categories_select_all_moderator" ON project_categories FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "project_categories_insert_admin" ON project_categories FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "project_categories_update_moderator" ON project_categories FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "project_categories_delete_admin" ON project_categories FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "governorates_select_public" ON governorates FOR SELECT
USING (status = 'active');

CREATE POLICY "governorates_select_all_moderator" ON governorates FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "governorates_insert_admin" ON governorates FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "governorates_update_moderator" ON governorates FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "governorates_delete_admin" ON governorates FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "areas_select_public" ON areas FOR SELECT
USING (status = 'active');

CREATE POLICY "areas_select_all_moderator" ON areas FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "areas_insert_admin" ON areas FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "areas_update_moderator" ON areas FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "areas_delete_admin" ON areas FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "streets_select_public" ON streets FOR SELECT
USING (status = 'active');

CREATE POLICY "streets_select_all_moderator" ON streets FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "streets_insert_admin" ON streets FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "streets_update_moderator" ON streets FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "streets_delete_admin" ON streets FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_owners_select_own" ON property_owners FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "property_owners_select_all_admin" ON property_owners FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_owners_insert_admin" ON property_owners FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_owners_update_own" ON property_owners FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "property_owners_update_all_admin" ON property_owners FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_owners_delete_admin" ON property_owners FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_types_select_public" ON property_types FOR SELECT
USING (status = 'active');

CREATE POLICY "property_types_select_all_moderator" ON property_types FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_types_insert_admin" ON property_types FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_types_update_moderator" ON property_types FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_types_delete_admin" ON property_types FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_facilities_select_public" ON property_facilities FOR SELECT
USING (status = 'active');

CREATE POLICY "property_facilities_select_all_moderator" ON property_facilities FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_facilities_insert_admin" ON property_facilities FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_facilities_update_moderator" ON property_facilities FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_facilities_delete_admin" ON property_facilities FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_services_select_public" ON property_services FOR SELECT
USING (status = 'active');

CREATE POLICY "property_services_select_all_moderator" ON property_services FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_services_insert_admin" ON property_services FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_services_update_moderator" ON property_services FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_services_delete_admin" ON property_services FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_view_types_select_public" ON property_view_types FOR SELECT
USING (status = 'active');

CREATE POLICY "property_view_types_select_all_moderator" ON property_view_types FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_view_types_insert_admin" ON property_view_types FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_view_types_update_moderator" ON property_view_types FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_view_types_delete_admin" ON property_view_types FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_finishing_types_select_public" ON property_finishing_types FOR SELECT
USING (status = 'active');

CREATE POLICY "property_finishing_types_select_all_moderator" ON property_finishing_types FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_finishing_types_insert_admin" ON property_finishing_types FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_finishing_types_update_moderator" ON property_finishing_types FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_finishing_types_delete_admin" ON property_finishing_types FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "payment_methods_select_public" ON payment_methods FOR SELECT
USING (status = 'active');

CREATE POLICY "payment_methods_select_all_moderator" ON payment_methods FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "payment_methods_insert_admin" ON payment_methods FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "payment_methods_update_moderator" ON payment_methods FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "payment_methods_delete_admin" ON payment_methods FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "sections_select_public" ON sections FOR SELECT
USING (status = 'active');

CREATE POLICY "sections_select_all_moderator" ON sections FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "sections_insert_admin" ON sections FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "sections_update_moderator" ON sections FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "sections_delete_admin" ON sections FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "properties_select_public" ON properties FOR SELECT
USING (status = 'active');

CREATE POLICY "properties_select_all_moderator" ON properties FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "properties_insert_sales" ON properties FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "properties_update_moderator" ON properties FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "properties_delete_admin" ON properties FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_images_select_public" ON property_images FOR SELECT
USING (EXISTS(SELECT 1 FROM properties WHERE properties.id = property_images.property_id AND properties.status = 'active'));

CREATE POLICY "property_images_select_all_moderator" ON property_images FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_images_insert_sales" ON property_images FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "property_images_update_moderator" ON property_images FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_images_delete_admin" ON property_images FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_property_facilities_select_public" ON property_property_facilities FOR SELECT
USING (true);

CREATE POLICY "property_property_facilities_insert_sales" ON property_property_facilities FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "property_property_facilities_update_moderator" ON property_property_facilities FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_property_facilities_delete_admin" ON property_property_facilities FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_property_services_select_public" ON property_property_services FOR SELECT
USING (true);

CREATE POLICY "property_property_services_insert_sales" ON property_property_services FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "property_property_services_update_moderator" ON property_property_services FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_property_services_delete_admin" ON property_property_services FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_bookings_insert_public" ON property_bookings FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "property_bookings_select_sales" ON property_bookings FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "property_bookings_update_moderator" ON property_bookings FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_bookings_delete_admin" ON property_bookings FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "featured_areas_select_public" ON featured_areas FOR SELECT
USING (status = 'active');

CREATE POLICY "featured_areas_select_all_moderator" ON featured_areas FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "featured_areas_insert_admin" ON featured_areas FOR INSERT
TO authenticated
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "featured_areas_update_moderator" ON featured_areas FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "featured_areas_delete_admin" ON featured_areas FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "property_comments_insert_public" ON property_comments FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "property_comments_select_public" ON property_comments FOR SELECT
USING (status = 'approved');

CREATE POLICY "property_comments_select_all_moderator" ON property_comments FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_comments_update_moderator" ON property_comments FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "property_comments_delete_admin" ON property_comments FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "direct_leads_insert_public" ON direct_leads FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "direct_leads_select_sales" ON direct_leads FOR SELECT
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','sales')));

CREATE POLICY "direct_leads_update_moderator" ON direct_leads FOR UPDATE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')))
WITH CHECK (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','moderator')));

CREATE POLICY "direct_leads_delete_admin" ON direct_leads FOR DELETE
TO authenticated
USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
