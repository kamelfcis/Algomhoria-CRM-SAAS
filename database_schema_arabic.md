# شرح قاعدة البيانات - موقع الأخبار والعقارات

## 📊 نظرة عامة على الجداول

قاعدة البيانات تحتوي على **32+ جدول رئيسي** و **6 مجلدات تخزين** للصور والملفات.

تنقسم الجداول إلى ثلاثة أقسام رئيسية:
1. **قسم الأخبار والمدونة** (11 جدول)
2. **قسم إدارة العقارات** (18 جدول)
3. **قسم إدارة العملاء المحتملين** (3 جداول)

---

## 📰 القسم الأول: الأخبار والمدونة

### 1️⃣ جدول `users` - المستخدمون

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد للمستخدم (Primary Key) |
| `email` | TEXT | البريد الإلكتروني (يجب أن يكون فريد) |
| `password_hash` | TEXT | كلمة المرور المشفرة |
| `name` | TEXT | اسم المستخدم |
| `phone_number` | TEXT | رقم الهاتف (اختياري) |
| `role` | TEXT | الدور: `admin` أو `moderator` أو `sales` أو `user` (افتراضي: `user`) |
| `author_image_url` | TEXT | رابط صورة المؤلف (من مجلد `authors`) |
| `status` | TEXT | الحالة: `active` أو `inactive` أو `suspended` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `posts.author_id` → `users.id`
- **يُشار إليه من**: `leads.created_by` → `users.id`
- **يُشار إليه من**: `leads.assigned_to` → `users.id`
- **يُشار إليه من**: `properties.created_by` → `users.id`
- **يُشار إليه من**: `property_comments.user_id` → `users.id`
- **يُشار إليه من**: `direct_leads.assigned_to` → `users.id`
- **يُشار إليه من**: `direct_leads.created_by` → `users.id`
- **يُشار إليه من**: `leads_assignments.assigned_to` → `users.id`
- **يُشار إليه من**: `leads_assignments.assigned_by` → `users.id`

---

### 2️⃣ جدول `team_users` - أعضاء الفريق

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name` | TEXT | اسم العضو (بالإنجليزية) |
| `name_ar` | TEXT | اسم العضو (بالعربية) - اختياري |
| `position` | TEXT | المنصب/الوظيفة (بالإنجليزية) |
| `poition_ar` | TEXT | المنصب/الوظيفة (بالعربية) - اختياري |
| `order_index` | INTEGER | ترتيب العرض (للتحكم في ترتيب الظهور) |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **لا توجد علاقات خارجية** (جدول مستقل)

---

### 3️⃣ جدول `categories` - فئات المقالات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `title_ar` | TEXT | العنوان بالعربية |
| `title_en` | TEXT | العنوان بالإنجليزية |
| `meta_title_ar` | TEXT | عنوان SEO بالعربية |
| `meta_title_en` | TEXT | عنوان SEO بالإنجليزية |
| `meta_description_ar` | TEXT | وصف SEO بالعربية |
| `meta_description_en` | TEXT | وصف SEO بالإنجليزية |
| `meta_keywords_ar` | TEXT | كلمات مفتاحية بالعربية |
| `meta_keywords_en` | TEXT | كلمات مفتاحية بالإنجليزية |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `posts.category_id` → `categories.id`

---

### 4️⃣ جدول `posts` - المقالات/الأخبار

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `title_ar` | TEXT | العنوان بالعربية |
| `title_en` | TEXT | العنوان بالإنجليزية |
| `excerpt_ar` | TEXT | الملخص بالعربية |
| `excerpt_en` | TEXT | الملخص بالإنجليزية |
| `content_ar` | TEXT | المحتوى الكامل بالعربية |
| `content_en` | TEXT | المحتوى الكامل بالإنجليزية |
| `meta_title_ar` | TEXT | عنوان SEO بالعربية |
| `meta_title_en` | TEXT | عنوان SEO بالإنجليزية |
| `meta_description_ar` | TEXT | وصف SEO بالعربية |
| `meta_description_en` | TEXT | وصف SEO بالإنجليزية |
| `meta_keywords_ar` | TEXT | كلمات مفتاحية بالعربية |
| `meta_keywords_en` | TEXT | كلمات مفتاحية بالإنجليزية |
| `category_id` | UUID | معرف الفئة (Foreign Key → `categories.id`) |
| `author_id` | UUID | معرف المؤلف (Foreign Key → `users.id`) |
| `thumbnail_url` | TEXT | رابط الصورة المصغرة (من مجلد `post-thumbnails`) |
| `cover_url` | TEXT | رابط صورة الغلاف (من مجلد `post-covers`) |
| `is_breaking_news` | BOOLEAN | هل هي خبر عاجل؟ (true/false) |
| `is_featured` | BOOLEAN | هل هي مقال مميز؟ (true/false) |
| `status` | TEXT | الحالة: `draft` أو `pending` أو `active` أو `inactive` |
| `published_at` | TIMESTAMPTZ | تاريخ النشر (اختياري) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `categories` عبر `category_id`
- **يربط مع**: `users` عبر `author_id`
- **يُشار إليه من**: `post_gallery.post_id` → `posts.id`

---

### 5️⃣ جدول `post_gallery` - معرض صور المقال

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `post_id` | UUID | معرف المقال (Foreign Key → `posts.id`) |
| `image_url` | TEXT |   رابط الصورة (من مجلد `post-gallery`) |
| `alt_text_ar` | TEXT | نص بديل للصورة بالعربية |
| `alt_text_en` | TEXT | نص بديل للصورة بالإنجليزية |
| `order_index` | INTEGER | ترتيب الصورة في المعرض |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `posts` عبر `post_id` (عند حذف المقال، تُحذف الصور تلقائياً)

---

### 6️⃣ جدول `sliders` - السلايدر/الشرائح

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `title_ar` | TEXT | العنوان بالعربية |
| `title_en` | TEXT | العنوان بالإنجليزية |
| `description_ar` | TEXT | الوصف بالعربية |
| `description_en` | TEXT | الوصف بالإنجليزية |
| `image_url` | TEXT | رابط الصورة (من مجلد `site-assets`) |
| `link_url` | TEXT | رابط عند الضغط على الشريحة (اختياري) |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **لا توجد علاقات خارجية** (جدول مستقل)

---

### 7️⃣ جدول `newsletter_subscribers` - مشتركو النشرة الإخبارية

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `email` | TEXT | البريد الإلكتروني (يجب أن يكون فريد) |
| `name` | TEXT | الاسم (اختياري) |
| `status` | TEXT | الحالة: `active` أو `unsubscribed` |
| `subscribed_at` | TIMESTAMPTZ | تاريخ الاشتراك |
| `unsubscribed_at` | TIMESTAMPTZ | تاريخ إلغاء الاشتراك (اختياري) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **لا توجد علاقات خارجية** (جدول مستقل)

---

### 8️⃣ جدول `leads` - الاستفسارات/الرسائل (محدث)

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `type` | TEXT | النوع: `message` أو `inquiry` أو `complaint` |
| `name` | TEXT | اسم المرسل |
| `phone_number` | TEXT | رقم الهاتف |
| `email` | TEXT | البريد الإلكتروني (اختياري) |
| `message` | TEXT | نص الرسالة |
| `entity_type` | TEXT | نوع الكيان المرتبط (مثل: `property` أو `post` أو `project`) |
| `entity_id` | UUID | معرف الكيان المرتبط |
| `entity_title` | TEXT | عنوان الكيان (مخزن للعرض السريع) |
| `created_by` | UUID | معرف المستخدم الذي أنشأ/عالج الاستفسار (Foreign Key → `users.id`) |
| `status` | TEXT | الحالة: `new` أو `handled` أو `archived` |
| `handled_at` | TIMESTAMPTZ | تاريخ المعالجة (اختياري) |
| **`assigned_to`** | UUID | **المستخدم المكلف بالاستفسار (Foreign Key → `users.id`)** ⭐ جديد |
| **`priority`** | TEXT | **الأولوية: `low` أو `normal` أو `high` أو `urgent`** ⭐ جديد |
| **`notes`** | TEXT | **ملاحظات إضافية** ⭐ جديد |
| **`property_owner_id`** | UUID | **معرف مالك العقار المرتبط (Foreign Key → `property_owners.id`)** ⭐ جديد |
| **`contacted_at`** | TIMESTAMPTZ | **تاريخ الاتصال** ⭐ جديد |
| **`converted_at`** | TIMESTAMPTZ | **تاريخ التحويل** ⭐ جديد |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `users` عبر `created_by` و `assigned_to`
- **يربط مع**: `property_owners` عبر `property_owner_id`
- **يُشار إليه من**: `leads_assignments.lead_id` → `leads.id`

---

### 9️⃣ جدول `settings` - إعدادات الموقع

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `key` | TEXT | مفتاح الإعداد (يجب أن يكون فريد) |
| `value` | TEXT | القيمة (نص) |
| `value_json` | JSONB | القيمة (JSON - للبيانات المعقدة) |
| `description` | TEXT | وصف الإعداد |
| `logo_url` | TEXT | رابط الشعار (من مجلد `site-assets`) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### الإعدادات الافتراضية:
- `site_name_ar` - اسم الموقع بالعربية
- `site_name_en` - اسم الموقع بالإنجليزية
- `site_description_ar` - وصف الموقع بالعربية
- `site_description_en` - وصف الموقع بالإنجليزية
- `logo_url` - رابط الشعار (من مجلد `site-assets`)
- `favicon_url` - رابط الأيقونة (من مجلد `site-assets`)
- `contact_email` - البريد الإلكتروني للاتصال
- `contact_phone` - رقم الهاتف للاتصال
- `facebook_url` - رابط فيسبوك
- `twitter_url` - رابط تويتر
- `instagram_url` - رابط إنستغرام
- `youtube_url` - رابط يوتيوب
- `linkedin_url` - رابط لينكد إن

#### العلاقات (Relationships):
- **لا توجد علاقات خارجية** (جدول مستقل)

---

### 🔟 جدول `projects` - المشاريع

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `title_ar` | TEXT | العنوان بالعربية |
| `title_en` | TEXT | العنوان بالإنجليزية |
| `description_ar` | TEXT | الوصف بالعربية |
| `description_en` | TEXT | الوصف بالإنجليزية |
| `category_id` | UUID | معرف فئة المشروع (Foreign Key → `project_categories.id`) |
| `image_url` | TEXT | رابط الصورة (من مجلد `site-assets`) |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `project_categories` عبر `category_id`

---

### 1️⃣1️⃣ جدول `project_categories` - فئات المشاريع

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `title_ar` | TEXT | العنوان بالعربية |
| `title_en` | TEXT | العنوان بالإنجليزية |
| `image_url` | TEXT | رابط الصورة (من مجلد `site-assets`) |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `projects.category_id` → `project_categories.id`

---

## 🏠 القسم الثاني: إدارة العقارات

### 1️⃣2️⃣ جدول `governorates` - المحافظات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم المحافظة بالعربية |
| `name_en` | TEXT | اسم المحافظة بالإنجليزية |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `areas.governorate_id` → `governorates.id`
- **يُشار إليه من**: `properties.governorate_id` → `governorates.id`
- **يُشار إليه من**: `featured_areas.governorate_id` → `governorates.id`

---

### 1️⃣3️⃣ جدول `areas` - المناطق

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `governorate_id` | UUID | معرف المحافظة (Foreign Key → `governorates.id`) |
| `name_ar` | TEXT | اسم المنطقة بالعربية |
| `name_en` | TEXT | اسم المنطقة بالإنجليزية |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `governorates` عبر `governorate_id`
- **يُشار إليه من**: `streets.area_id` → `areas.id`
- **يُشار إليه من**: `properties.area_id` → `areas.id`
- **يُشار إليه من**: `featured_areas.area_id` → `areas.id`

---

### 1️⃣4️⃣ جدول `streets` - الشوارع

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `area_id` | UUID | معرف المنطقة (Foreign Key → `areas.id`) |
| `name_ar` | TEXT | اسم الشارع بالعربية |
| `name_en` | TEXT | اسم الشارع بالإنجليزية |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `areas` عبر `area_id`
- **يُشار إليه من**: `properties.street_id` → `streets.id`

---

### 1️⃣5️⃣ جدول `property_owners` - ملاك العقارات (محدث)

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name` | TEXT | اسم المالك |
| `phone_number` | TEXT | رقم الهاتف |
| **`email`** | TEXT | **البريد الإلكتروني (فريد) - للدخول** ⭐ جديد |
| **`password_hash`** | TEXT | **كلمة المرور المشفرة** ⭐ جديد |
| **`status`** | TEXT | **الحالة: `active` أو `inactive` أو `suspended`** ⭐ جديد |
| **`last_login_at`** | TIMESTAMPTZ | **تاريخ آخر دخول** ⭐ جديد |
| **`login_count`** | INTEGER | **عدد مرات الدخول** ⭐ جديد |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `properties.owner_id` → `property_owners.id`
- **يُشار إليه من**: `leads.property_owner_id` → `property_owners.id`
- **يُشار إليه من**: `direct_leads.property_owner_id` → `property_owners.id`

---

### 1️⃣6️⃣ جدول `property_types` - أنواع العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم النوع بالعربية |
| `name_en` | TEXT | اسم النوع بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `properties.property_type_id` → `property_types.id`

---

### 1️⃣7️⃣ جدول `property_facilities` - مرافق العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم المرفق بالعربية |
| `name_en` | TEXT | اسم المرفق بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `properties` عبر جدول `property_property_facilities` (علاقة many-to-many)

---

### 1️⃣8️⃣ جدول `property_services` - خدمات العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم الخدمة بالعربية |
| `name_en` | TEXT | اسم الخدمة بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `properties` عبر جدول `property_property_services` (علاقة many-to-many)

---

### 1️⃣9️⃣ جدول `property_view_types` - أنواع الإطلالات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم النوع بالعربية |
| `name_en` | TEXT | اسم النوع بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `properties.view_type_id` → `property_view_types.id`

---

### 2️⃣0️⃣ جدول `property_finishing_types` - أنواع التشطيبات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم النوع بالعربية |
| `name_en` | TEXT | اسم النوع بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `properties.finishing_type_id` → `property_finishing_types.id`

---

### 2️⃣1️⃣ جدول `payment_methods` - طرق الدفع

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم الطريقة بالعربية |
| `name_en` | TEXT | اسم الطريقة بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `properties.payment_method_id` → `payment_methods.id`

---

### 2️⃣2️⃣ جدول `sections` - الأقسام

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name_ar` | TEXT | اسم القسم بالعربية |
| `name_en` | TEXT | اسم القسم بالإنجليزية |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يُشار إليه من**: `properties.section_id` → `sections.id`

---

### 2️⃣3️⃣ جدول `properties` - العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `code` | TEXT | كود العقار (فريد) |
| `old_code` | TEXT | الكود القديم |
| `title_ar` | TEXT | العنوان بالعربية |
| `title_en` | TEXT | العنوان بالإنجليزية |
| `description_ar` | TEXT | الوصف بالعربية |
| `description_en` | TEXT | الوصف بالإنجليزية |
| `address_ar` | TEXT | العنوان بالعربية |
| `address_en` | TEXT | العنوان بالإنجليزية |
| `governorate_id` | UUID | معرف المحافظة (Foreign Key → `governorates.id`) |
| `area_id` | UUID | معرف المنطقة (Foreign Key → `areas.id`) |
| `street_id` | UUID | معرف الشارع (Foreign Key → `streets.id`) |
| `location_text` | TEXT | نص الموقع (لخرائط جوجل) |
| `latitude` | DECIMAL(10,8) | خط العرض |
| `longitude` | DECIMAL(11,8) | خط الطول |
| `owner_id` | UUID | معرف المالك (Foreign Key → `property_owners.id`) |
| `section_id` | UUID | معرف القسم (Foreign Key → `sections.id`) |
| `property_type_id` | UUID | معرف نوع العقار (Foreign Key → `property_types.id`) |
| `price` | DECIMAL(15,2) | السعر |
| `payment_method_id` | UUID | معرف طريقة الدفع (Foreign Key → `payment_methods.id`) |
| `size` | DECIMAL(10,2) | المساحة بالمتر المربع |
| `baths` | INTEGER | عدد الحمامات |
| `floor_no` | INTEGER | رقم الطابق |
| `view_type_id` | UUID | معرف نوع الإطلالة (Foreign Key → `property_view_types.id`) |
| `finishing_type_id` | UUID | معرف نوع التشطيب (Foreign Key → `property_finishing_types.id`) |
| `phone_number` | TEXT | رقم الهاتف |
| `status` | TEXT | الحالة: `pending` أو `active` أو `inactive` أو `rejected` أو `deleted` أو `expired` أو `rented` أو `sold` |
| `is_featured` | BOOLEAN | هل هو مميز؟ |
| `is_rented` | BOOLEAN | هل هو مؤجر؟ |
| `is_sold` | BOOLEAN | هل هو مباع؟ |
| `created_by` | UUID | معرف المستخدم الذي أنشأه (Foreign Key → `users.id`) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |
| `expired_at` | TIMESTAMPTZ | تاريخ انتهاء الصلاحية |

#### العلاقات (Relationships):
- **يربط مع**: `governorates`, `areas`, `streets`, `property_owners`, `sections`, `property_types`, `payment_methods`, `property_view_types`, `property_finishing_types`, `users`
- **يُشار إليه من**: `property_images.property_id` → `properties.id`
- **يُشار إليه من**: `property_bookings.property_id` → `properties.id`
- **يُشار إليه من**: `property_comments.property_id` → `properties.id`
- **يربط مع**: `property_facilities` عبر `property_property_facilities` (many-to-many)
- **يربط مع**: `property_services` عبر `property_property_services` (many-to-many)

---

### 2️⃣4️⃣ جدول `property_images` - صور العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `property_id` | UUID | معرف العقار (Foreign Key → `properties.id`) |
| `image_url` | TEXT | رابط الصورة (من مجلد `property-images`) |
| `alt_text_ar` | TEXT | نص بديل بالعربية |
| `alt_text_en` | TEXT | نص بديل بالإنجليزية |
| `order_index` | INTEGER | ترتيب الصورة |
| `is_primary` | BOOLEAN | هل هي الصورة الرئيسية؟ |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `properties` عبر `property_id` (عند حذف العقار، تُحذف الصور تلقائياً)

---

### 2️⃣5️⃣ جدول `property_property_facilities` - علاقة العقارات والمرافق

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `property_id` | UUID | معرف العقار (Foreign Key → `properties.id`) |
| `facility_id` | UUID | معرف المرفق (Foreign Key → `property_facilities.id`) |

#### العلاقات (Relationships):
- **جدول علاقة many-to-many** بين `properties` و `property_facilities`

---

### 2️⃣6️⃣ جدول `property_property_services` - علاقة العقارات والخدمات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `property_id` | UUID | معرف العقار (Foreign Key → `properties.id`) |
| `service_id` | UUID | معرف الخدمة (Foreign Key → `property_services.id`) |

#### العلاقات (Relationships):
- **جدول علاقة many-to-many** بين `properties` و `property_services`

---

### 2️⃣7️⃣ جدول `property_bookings` - حجوزات العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `property_id` | UUID | معرف العقار (Foreign Key → `properties.id`) |
| `customer_name` | TEXT | اسم العميل |
| `customer_email` | TEXT | بريد العميل |
| `customer_phone` | TEXT | هاتف العميل |
| `booking_from_date` | DATE | تاريخ بداية الحجز |
| `booking_to_date` | DATE | تاريخ نهاية الحجز |
| `total_price` | DECIMAL(15,2) | السعر الإجمالي |
| `status` | TEXT | الحالة: `pending` أو `confirmed` أو `cancelled` أو `completed` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `properties` عبر `property_id`

---

### 2️⃣8️⃣ جدول `featured_areas` - المناطق المميزة

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `governorate_id` | UUID | معرف المحافظة (Foreign Key → `governorates.id`) |
| `area_id` | UUID | معرف المنطقة (Foreign Key → `areas.id`) |
| `projects_order` | JSONB | ترتيب المشاريع (مصفوفة من معرفات المشاريع) |
| `order_index` | INTEGER | ترتيب العرض |
| `status` | TEXT | الحالة: `active` أو `inactive` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `governorates` و `areas`

---

### 2️⃣9️⃣ جدول `property_comments` - تعليقات العقارات

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `property_id` | UUID | معرف العقار (Foreign Key → `properties.id`) |
| `user_id` | UUID | معرف المستخدم (Foreign Key → `users.id` - اختياري) |
| `name` | TEXT | اسم المعلق |
| `email` | TEXT | بريد المعلق |
| `comment_text` | TEXT | نص التعليق |
| `status` | TEXT | الحالة: `pending` أو `approved` أو `rejected` |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |

#### العلاقات (Relationships):
- **يربط مع**: `properties` عبر `property_id`
- **يربط مع**: `users` عبر `user_id` (اختياري)

---

## 📞 القسم الثالث: إدارة العملاء المحتملين المحسّنة

### 3️⃣0️⃣ جدول `direct_leads` - العملاء المحتملين المباشرين ⭐ جديد

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `name` | TEXT | الاسم |
| `phone_number` | TEXT | رقم الهاتف |
| `email` | TEXT | البريد الإلكتروني |
| `message` | TEXT | الرسالة |
| `source` | TEXT | المصدر (موقع، هاتف، إحالة، إلخ) |
| `property_owner_id` | UUID | معرف مالك العقار المرتبط (Foreign Key → `property_owners.id`) |
| `assigned_to` | UUID | المستخدم المكلف (Foreign Key → `users.id`) |
| `status` | TEXT | الحالة: `new` أو `contacted` أو `qualified` أو `converted` أو `lost` أو `archived` |
| `priority` | TEXT | الأولوية: `low` أو `normal` أو `high` أو `urgent` |
| `notes` | TEXT | ملاحظات |
| `created_by` | UUID | معرف المستخدم الذي أنشأه (Foreign Key → `users.id`) |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |
| `contacted_at` | TIMESTAMPTZ | تاريخ الاتصال |
| `converted_at` | TIMESTAMPTZ | تاريخ التحويل |

#### العلاقات (Relationships):
- **يربط مع**: `property_owners` عبر `property_owner_id`
- **يربط مع**: `users` عبر `assigned_to` و `created_by`
- **يُشار إليه من**: `leads_assignments.direct_lead_id` → `direct_leads.id`

---

### 3️⃣1️⃣ جدول `leads_assignments` - تكليف العملاء المحتملين ⭐ جديد

#### الأعمدة (Columns):

| اسم العمود | النوع | الوصف |
|-----------|------|-------|
| `id` | UUID | المعرف الفريد (Primary Key) |
| `lead_id` | UUID | معرف الاستفسار العادي (Foreign Key → `leads.id`) |
| `direct_lead_id` | UUID | معرف العميل المحتمل المباشر (Foreign Key → `direct_leads.id`) |
| `assigned_to` | UUID | المستخدم المكلف (Foreign Key → `users.id`) |
| `assigned_by` | UUID | المستخدم الذي كلفه (Foreign Key → `users.id`) |
| `status` | TEXT | الحالة: `active` أو `completed` أو `cancelled` |
| `notes` | TEXT | ملاحظات |
| `created_at` | TIMESTAMPTZ | تاريخ الإنشاء |
| `updated_at` | TIMESTAMPTZ | تاريخ آخر تحديث |
| `completed_at` | TIMESTAMPTZ | تاريخ الإتمام |

#### العلاقات (Relationships):
- **يربط مع**: `leads` عبر `lead_id` (أو `direct_leads` عبر `direct_lead_id` - واحد فقط)
- **يربط مع**: `users` عبر `assigned_to` و `assigned_by`

#### ملاحظة مهمة:
- يجب أن يكون إما `lead_id` أو `direct_lead_id` موجوداً (وليس كلاهما)

---

## 📦 مجلدات التخزين (Storage Buckets)

### 1. `post-thumbnails`
- **الوصف**: الصور المصغرة للمقالات
- **الحجم الأقصى**: 5 ميجابايت
- **الصيغ المدعومة**: JPEG, PNG, WebP
- **متصلة مع**: `posts.thumbnail_url`

### 2. `post-covers`
- **الوصف**: صور الغلاف للمقالات
- **الحجم الأقصى**: 10 ميجابايت
- **الصيغ المدعومة**: JPEG, PNG, WebP
- **متصلة مع**: `posts.cover_url`

### 3. `post-gallery`
- **الوصف**: صور معرض المقال
- **الحجم الأقصى**: 10 ميجابايت
- **الصيغ المدعومة**: JPEG, PNG, WebP
- **متصلة مع**: `post_gallery.image_url`

### 4. `site-assets`
- **الوصف**: أصول الموقع (شعارات، أيقونات، صور السلايدر)
- **الحجم الأقصى**: 5 ميجابايت
- **الصيغ المدعومة**: JPEG, PNG, SVG, WebP
- **متصلة مع**: 
  - `settings.logo_url`
  - `sliders.image_url`
  - `projects.image_url`
  - `project_categories.image_url`

### 5. `authors`
- **الوصف**: صور المؤلفين
- **الحجم الأقصى**: 5 ميجابايت
- **الصيغ المدعومة**: JPEG, PNG, WebP
- **متصلة مع**: `users.author_image_url`

### 6. `property-images` ⭐ جديد
- **الوصف**: صور العقارات
- **الحجم الأقصى**: 10 ميجابايت
- **الصيغ المدعومة**: JPEG, PNG, WebP
- **متصلة مع**: `property_images.image_url`

---

## 🔗 مخطط العلاقات (Relationships Diagram)

```
users (المستخدمون)
  ├── posts.author_id → users.id
  ├── leads.created_by → users.id
  ├── leads.assigned_to → users.id
  ├── properties.created_by → users.id
  ├── property_comments.user_id → users.id
  ├── direct_leads.assigned_to → users.id
  ├── direct_leads.created_by → users.id
  ├── leads_assignments.assigned_to → users.id
  └── leads_assignments.assigned_by → users.id

categories (الفئات)
  └── posts.category_id → categories.id

posts (المقالات)
  ├── posts.category_id → categories.id
  ├── posts.author_id → users.id
  └── post_gallery.post_id → posts.id (CASCADE DELETE)

project_categories (فئات المشاريع)
  └── projects.category_id → project_categories.id

projects (المشاريع)
  └── projects.category_id → project_categories.id

governorates (المحافظات)
  ├── areas.governorate_id → governorates.id
  ├── properties.governorate_id → governorates.id
  └── featured_areas.governorate_id → governorates.id

areas (المناطق)
  ├── streets.area_id → areas.id
  ├── properties.area_id → areas.id
  └── featured_areas.area_id → areas.id

streets (الشوارع)
  └── properties.street_id → streets.id

property_owners (مالكو العقارات)
  ├── properties.owner_id → property_owners.id
  ├── leads.property_owner_id → property_owners.id
  └── direct_leads.property_owner_id → property_owners.id

properties (العقارات)
  ├── properties.owner_id → property_owners.id
  ├── properties.governorate_id → governorates.id
  ├── properties.area_id → areas.id
  ├── properties.street_id → streets.id
  ├── properties.property_type_id → property_types.id
  ├── properties.created_by → users.id
  ├── property_images.property_id → properties.id (CASCADE DELETE)
  ├── property_bookings.property_id → properties.id
  ├── property_comments.property_id → properties.id
  ├── property_property_facilities.property_id → properties.id (many-to-many)
  └── property_property_services.property_id → properties.id (many-to-many)

property_comments (تعليقات العقارات)
  ├── property_comments.property_id → properties.id
  └── property_comments.user_id → users.id

leads (الاستفسارات)
  ├── leads.created_by → users.id
  ├── leads.assigned_to → users.id
  ├── leads.property_owner_id → property_owners.id
  └── leads_assignments.lead_id → leads.id

direct_leads (العملاء المحتملين المباشرين)
  ├── direct_leads.property_owner_id → property_owners.id
  ├── direct_leads.assigned_to → users.id
  └── leads_assignments.direct_lead_id → direct_leads.id

leads_assignments (تكليف العملاء المحتملين)
  ├── leads_assignments.lead_id → leads.id (أو)
  ├── leads_assignments.direct_lead_id → direct_leads.id
  ├── leads_assignments.assigned_to → users.id
  └── leads_assignments.assigned_by → users.id
```

---

## 🔐 الأمان والصلاحيات (Security & Permissions)

### أدوار المستخدمين:
- **admin**: صلاحيات كاملة على جميع الجداول
- **moderator**: يمكن إنشاء وتعديل وحذف المقالات والفئات والعقارات والاستفسارات
- **sales**: يمكن إنشاء المقالات والعقارات وإدارة العملاء المحتملين
- **user**: المستخدم العادي (افتراضي)

### أدوار ملاك العقارات:
- **property_owners**: يمكنهم الدخول إلى حساباتهم ومشاهدة استفساراتهم المرتبطة

### سياسات الوصول:
- **القراءة العامة**: يمكن للجميع قراءة المحتوى النشط فقط
- **القراءة للمصادقين**: المستخدمون المسجلون يمكنهم قراءة جميع البيانات
- **الكتابة**: فقط المستخدمون المصادقون يمكنهم إضافة/تعديل/حذف البيانات
- **ملاك العقارات**: يمكنهم قراءة وتحديث بياناتهم الخاصة والاستفسارات المرتبطة بهم

---

## 📝 ملاحظات مهمة

1. **الحقول ثنائية اللغة**: معظم الجداول تحتوي على حقول `_ar` و `_en` للدعم الكامل للعربية والإنجليزية
2. **Timestamps تلقائية**: جميع الجداول تحتوي على `created_at` و `updated_at` يتم تحديثها تلقائياً
3. **CASCADE DELETE**: 
   - عند حذف مقال، تُحذف صور المعرض تلقائياً
   - عند حذف عقار، تُحذف صوره تلقائياً
   - عند حذف محافظة، تُحذف المناطق والشوارع تلقائياً
4. **SET NULL**: عند حذف فئة أو مستخدم أو مالك عقار، يتم تعيين القيم المرتبطة إلى NULL بدلاً من الحذف
5. **Full-text Search**: جدول `posts` يحتوي على فهارس للبحث النصي الكامل بالعربية والإنجليزية
6. **Many-to-Many**: العلاقات بين العقارات والمرافق والخدمات تتم عبر جداول وسيطة
7. **مصادقة ملاك العقارات**: يمكن لمالكي العقارات الدخول إلى حساباتهم باستخدام البريد الإلكتروني وكلمة المرور
8. **نظام التكليف**: يمكن تكليف الاستفسارات والعملاء المحتملين لأعضاء الفريق للمتابعة

---

## 🎯 الاستخدام المقترح

### للمطورين:
- استخدم `posts.is_breaking_news = true` لعرض الأخبار العاجلة
- استخدم `posts.is_featured = true` لعرض المقالات المميزة
- استخدم `properties.is_featured = true` لعرض العقارات المميزة
- استخدم `order_index` للتحكم في ترتيب العرض
- استخدم `status = 'active'` لعرض المحتوى للزوار
- استخدم `priority` في `leads` و `direct_leads` لإدارة الأولويات

### للمديرين:
- راجع `leads` و `direct_leads` بانتظام للرد على الاستفسارات
- استخدم `leads_assignments` لتوزيع العملاء المحتملين على الفريق
- استخدم `newsletter_subscribers` لإرسال النشرات
- قم بتحديث `settings` لإعدادات الموقع
- استخدم `sliders` لإدارة الشرائح في الصفحة الرئيسية
- استخدم `featured_areas` لعرض المناطق المميزة في الصفحة الرئيسية
- راجع `property_bookings` لإدارة الحجوزات

### لملاك العقارات:
- يمكنهم الدخول إلى حساباتهم لمشاهدة استفساراتهم
- يمكنهم تحديث معلوماتهم الشخصية

---

## 📊 ملخص الجداول

### قسم الأخبار والمدونة (11 جدول):
1. users
2. team_users
3. categories
4. posts
5. post_gallery
6. sliders
7. newsletter_subscribers
8. leads
9. settings
10. projects
11. project_categories

### قسم إدارة العقارات (18 جدول):
12. governorates
13. areas
14. streets
15. property_owners
16. property_types
17. property_facilities
18. property_services
19. property_view_types
20. property_finishing_types
21. payment_methods
22. sections
23. properties
24. property_images
25. property_property_facilities
26. property_property_services
27. property_bookings
28. featured_areas
29. property_comments

### قسم إدارة العملاء المحتملين (3 جداول):
30. direct_leads
31. leads_assignments
(8. leads - محدث)

**المجموع: 32+ جدول + 6 مجلدات تخزين**

---

**تم إنشاء هذا التوثيق بناءً على ملف `supabase_migration_full.sql`**

**آخر تحديث**: يتضمن جميع الميزات الجديدة:
- إدارة العقارات الكاملة مع حالات متقدمة (pending, active, rejected, expired, rented, sold)
- نظام العملاء المحتملين المحسّن (leads, direct_leads, leads_assignments)
- مصادقة ملاك العقارات مع تتبع تسجيلات الدخول
- أدوار مستخدمين محدثة (admin, moderator, sales, user)
- نظام أولويات للاستفسارات (low, normal, high, urgent)
- إضافة حقل logo_url في جدول settings
