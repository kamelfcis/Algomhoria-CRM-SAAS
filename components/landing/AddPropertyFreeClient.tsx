'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Locale = 'ar' | 'en'

interface LandingOption {
  id: string
  name: string
  governorate_id?: string | null
}

interface MyPropertyItem {
  id: string
  code?: string | null
  title_ar?: string | null
  title_en?: string | null
  status?: string | null
  created_at?: string | null
  location_text?: string | null
  sale_price?: number | null
  rent_price?: number | null
  price?: number | null
}

type FormSectionKey = 'basic' | 'details' | 'location' | 'pricing' | 'specs' | 'media'

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const raw = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1]
  return raw === 'ar' ? 'ar' : 'en'
}

export function AddPropertyFreeClient({ forcedLocale }: { forcedLocale?: Locale }) {
  const [locale] = useState<Locale>(() => forcedLocale || getLocaleFromCookie())
  const [loading, setLoading] = useState(false)
  const [loadingFilters, setLoadingFilters] = useState(true)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [governorates, setGovernorates] = useState<LandingOption[]>([])
  const [areas, setAreas] = useState<LandingOption[]>([])
  const [propertyTypes, setPropertyTypes] = useState<LandingOption[]>([])
  const [sections, setSections] = useState<LandingOption[]>([])

  const [titleAr, setTitleAr] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [descriptionAr, setDescriptionAr] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [locationText, setLocationText] = useState('')
  const [governorateId, setGovernorateId] = useState('')
  const [areaId, setAreaId] = useState('')
  const [propertyTypeId, setPropertyTypeId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [price, setPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [rentPrice, setRentPrice] = useState('')
  const [size, setSize] = useState('')
  const [baths, setBaths] = useState('')
  const [rooms, setRooms] = useState('')
  const [receptions, setReceptions] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [myProperties, setMyProperties] = useState<MyPropertyItem[]>([])
  const [myPropertiesLoading, setMyPropertiesLoading] = useState(true)
  const [myPropertiesUnauthorized, setMyPropertiesUnauthorized] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<FormSectionKey, boolean>>({
    basic: true,
    details: true,
    location: true,
    pricing: true,
    specs: true,
    media: true,
  })

  const MAX_IMAGES = 10
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoadingFilters(true)
        const response = await fetch(`/api/landing/filters?locale=${locale}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || cancelled) throw new Error(payload?.error || 'Failed to load filters')
        setGovernorates(payload?.data?.governorates || [])
        setAreas(payload?.data?.areas || [])
        setPropertyTypes(payload?.data?.propertyTypes || [])
        setSections(payload?.data?.sections || [])
      } catch {
        if (!cancelled) {
          setStatus({
            type: 'error',
            message:
              locale === 'ar'
                ? 'تعذر تحميل بيانات القوائم'
                : 'Failed to load lookup data',
          })
        }
      } finally {
        if (!cancelled) setLoadingFilters(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [locale])

  const loadMyProperties = useCallback(async () => {
    setMyPropertiesLoading(true)
    try {
      const response = await fetch('/api/landing/my-properties', { cache: 'no-store' })
      if (response.status === 401) {
        setMyPropertiesUnauthorized(true)
        setMyProperties([])
        return
      }
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Failed to load properties')
      setMyPropertiesUnauthorized(false)
      setMyProperties(Array.isArray(payload?.data) ? payload.data : [])
    } catch {
      setMyProperties([])
    } finally {
      setMyPropertiesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyProperties()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mobile = window.innerWidth < 992
    if (!mobile) return
    setExpandedSections({
      basic: true,
      details: false,
      location: false,
      pricing: false,
      specs: false,
      media: false,
    })
  }, [])

  useEffect(() => {
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    const previews = images.map((file) => URL.createObjectURL(file))
    setImagePreviews(previews)
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length])

  const text = useMemo(
    () =>
      locale === 'ar'
        ? {
            title: 'أضف عقارك مجانا',
            subtitle: 'ارسل بيانات عقارك وسيتم مراجعته قبل النشر',
            ownerName: 'اسم المعلن',
            ownerEmail: 'بريد المعلن',
            phone: 'رقم الهاتف',
            titleAr: 'عنوان العقار (عربي)',
            titleEn: 'عنوان العقار (إنجليزي)',
            descriptionAr: 'الوصف (عربي)',
            descriptionEn: 'الوصف (إنجليزي)',
            locationText: 'وصف الموقع',
            governorate: 'المحافظة',
            area: 'المنطقة',
            propertyType: 'نوع العقار',
            section: 'القسم',
            price: 'السعر العام',
            salePrice: 'سعر البيع',
            rentPrice: 'سعر الإيجار',
            size: 'المساحة',
            baths: 'عدد الحمامات',
            rooms: 'عدد الغرف',
            receptions: 'عدد الريسبشن',
            images: 'صور العقار',
            imageHint: 'حتى 10 صور، كل صورة حتى 5MB (JPG/PNG/WEBP)',
            submit: 'إرسال الطلب',
            submitting: 'جاري الإرسال...',
            selectPlaceholder: 'اختر',
            success: 'تم إرسال طلبك بنجاح وسيتم مراجعته من الإدارة',
            requiredLookup: 'يرجى اختيار نوع العقار والقسم',
            myPropertiesTitle: 'عقاراتي',
            myPropertiesSubtitle: 'حالة العقارات المضافة من حسابك',
            authRequired: 'يرجى تسجيل الدخول لعرض عقاراتك',
            emptyMyProperties: 'لا توجد عقارات مضافة حتى الآن',
            sectionBasic: 'البيانات الأساسية',
            sectionDetails: 'تفاصيل العقار',
            sectionLocation: 'الموقع والتصنيف',
            sectionPricing: 'الأسعار',
            sectionSpecs: 'المواصفات',
            sectionMedia: 'الصور والوسائط',
            statusLabels: {
              pending: 'قيد المراجعة',
              active: 'نشط',
              approved: 'مقبول',
              rejected: 'مرفوض',
              inactive: 'غير نشط',
              sold: 'تم البيع',
              rented: 'تم التأجير',
              expired: 'منتهي',
              deleted: 'محذوف',
              unknown: 'غير معروف',
            } as Record<string, string>,
          }
        : {
            title: 'Add Property Free',
            subtitle: 'Submit your property details for moderation before publishing',
            ownerName: 'Owner Name',
            ownerEmail: 'Owner Email',
            phone: 'Phone Number',
            titleAr: 'Property Title (Arabic)',
            titleEn: 'Property Title (English)',
            descriptionAr: 'Description (Arabic)',
            descriptionEn: 'Description (English)',
            locationText: 'Location Text',
            governorate: 'Governorate',
            area: 'Area',
            propertyType: 'Property Type',
            section: 'Section',
            price: 'General Price',
            salePrice: 'Sale Price',
            rentPrice: 'Rent Price',
            size: 'Size',
            baths: 'Baths',
            rooms: 'Rooms',
            receptions: 'Receptions',
            images: 'Property Images',
            imageHint: 'Up to 10 images, each up to 5MB (JPG/PNG/WEBP)',
            submit: 'Submit Request',
            submitting: 'Submitting...',
            selectPlaceholder: 'Select',
            success: 'Your property has been submitted successfully and is pending review',
            requiredLookup: 'Please select section and property type',
            myPropertiesTitle: 'My Properties',
            myPropertiesSubtitle: 'Status of properties submitted by your account',
            authRequired: 'Please login to view your properties',
            emptyMyProperties: 'No submitted properties yet',
            sectionBasic: 'Basic Information',
            sectionDetails: 'Property Details',
            sectionLocation: 'Location & Classification',
            sectionPricing: 'Pricing',
            sectionSpecs: 'Specifications',
            sectionMedia: 'Media',
            statusLabels: {
              pending: 'Pending Review',
              active: 'Active',
              approved: 'Approved',
              rejected: 'Rejected',
              inactive: 'Inactive',
              sold: 'Sold',
              rented: 'Rented',
              expired: 'Expired',
              deleted: 'Deleted',
              unknown: 'Unknown',
            } as Record<string, string>,
          },
    [locale]
  )

  const filteredAreas = useMemo(() => {
    if (!governorateId) return areas
    return areas.filter((item) => item.governorate_id === governorateId)
  }, [areas, governorateId])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || [])
    if (selected.length === 0) return
    const merged = [...images, ...selected]
    if (merged.length > MAX_IMAGES) {
      setStatus({
        type: 'error',
        message: locale === 'ar' ? `الحد الأقصى ${MAX_IMAGES} صور` : `Maximum ${MAX_IMAGES} images allowed`,
      })
      return
    }
    for (const file of merged) {
      if (!allowedImageTypes.includes(file.type)) {
        setStatus({
          type: 'error',
          message: locale === 'ar' ? 'صيغة صورة غير مدعومة' : 'Unsupported image format',
        })
        return
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setStatus({
          type: 'error',
          message: locale === 'ar' ? 'الصورة أكبر من 5MB' : 'Image size exceeds 5MB',
        })
        return
      }
    }
    setStatus(null)
    setImages(merged)
  }

  const removeImageAt = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index))
  }

  const resetForm = () => {
    setTitleAr('')
    setTitleEn('')
    setDescriptionAr('')
    setDescriptionEn('')
    setLocationText('')
    setGovernorateId('')
    setAreaId('')
    setPropertyTypeId('')
    setSectionId('')
    setPhoneNumber('')
    setOwnerName('')
    setOwnerEmail('')
    setPrice('')
    setSalePrice('')
    setRentPrice('')
    setSize('')
    setBaths('')
    setRooms('')
    setReceptions('')
    setImages([])
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus(null)

    if (!propertyTypeId || !sectionId) {
      setStatus({ type: 'error', message: text.requiredLookup })
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title_ar', titleAr)
      formData.append('title_en', titleEn)
      if (descriptionAr.trim()) formData.append('description_ar', descriptionAr.trim())
      if (descriptionEn.trim()) formData.append('description_en', descriptionEn.trim())
      if (locationText.trim()) formData.append('location_text', locationText.trim())
      if (governorateId) formData.append('governorate_id', governorateId)
      if (areaId) formData.append('area_id', areaId)
      formData.append('property_type_id', propertyTypeId)
      formData.append('section_id', sectionId)
      if (phoneNumber.trim()) formData.append('phone_number', phoneNumber.trim())
      if (ownerName.trim()) formData.append('owner_name', ownerName.trim())
      if (ownerEmail.trim()) formData.append('owner_email', ownerEmail.trim())
      if (price.trim()) formData.append('price', price.trim())
      if (salePrice.trim()) formData.append('sale_price', salePrice.trim())
      if (rentPrice.trim()) formData.append('rent_price', rentPrice.trim())
      if (size.trim()) formData.append('size', size.trim())
      if (baths.trim()) formData.append('baths', baths.trim())
      if (rooms.trim()) formData.append('no_of_rooms', rooms.trim())
      if (receptions.trim()) formData.append('no_of_receptions', receptions.trim())
      images.forEach((file) => formData.append('images', file))

      const response = await fetch('/api/landing/add-property', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to submit property')
      }
      setStatus({ type: 'success', message: text.success })
      resetForm()
      loadMyProperties()
    } catch (error: any) {
      setStatus({
        type: 'error',
        message: error?.message || (locale === 'ar' ? 'فشل إرسال الطلب' : 'Failed to submit request'),
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleSection = (sectionKey: FormSectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))
  }

  return (
    <div className="container-fluid py-5">
      <div className="container py-5">
        <div className="text-center mx-auto pb-5 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: 900 }}>
          <h1 className="display-5 mb-3">{text.title}</h1>
          <p className="mb-0 text-muted">{text.subtitle}</p>
        </div>

        <div className="property-panel p-4 p-md-5">
          {loadingFilters ? (
            <p className="mb-0 text-muted">Loading...</p>
          ) : (
            <form className="row g-3" onSubmit={handleSubmit}>
              <div className="col-12 landing-form-section">
                <button type="button" className="landing-form-section-header" onClick={() => toggleSection('basic')}>
                  <span>{text.sectionBasic}</span>
                  <i className={`fas fa-chevron-down landing-form-section-chevron ${expandedSections.basic ? 'open' : ''}`}></i>
                </button>
                {expandedSections.basic && (
                  <div className="landing-form-section-body row g-3">
                    <div className="col-md-4">
                      <label className="form-label">{text.ownerName}</label>
                      <input className="form-control modern-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">{text.ownerEmail}</label>
                      <input type="email" className="form-control modern-input" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">{text.phone}</label>
                      <input className="form-control modern-input" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-12 landing-form-section">
                <button type="button" className="landing-form-section-header" onClick={() => toggleSection('details')}>
                  <span>{text.sectionDetails}</span>
                  <i className={`fas fa-chevron-down landing-form-section-chevron ${expandedSections.details ? 'open' : ''}`}></i>
                </button>
                {expandedSections.details && (
                  <div className="landing-form-section-body row g-3">
                    <div className="col-md-6">
                      <label className="form-label">{text.titleAr}</label>
                      <input className="form-control modern-input" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} required minLength={2} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{text.titleEn}</label>
                      <input className="form-control modern-input" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required minLength={2} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{text.descriptionAr}</label>
                      <textarea className="form-control modern-input" style={{ minHeight: 110 }} value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{text.descriptionEn}</label>
                      <textarea className="form-control modern-input" style={{ minHeight: 110 }} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">{text.locationText}</label>
                      <input className="form-control modern-input" value={locationText} onChange={(e) => setLocationText(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-12 landing-form-section">
                <button type="button" className="landing-form-section-header" onClick={() => toggleSection('location')}>
                  <span>{text.sectionLocation}</span>
                  <i className={`fas fa-chevron-down landing-form-section-chevron ${expandedSections.location ? 'open' : ''}`}></i>
                </button>
                {expandedSections.location && (
                  <div className="landing-form-section-body row g-3">
                    <div className="col-md-3">
                      <label className="form-label">{text.governorate}</label>
                      <select
                        className="form-select modern-input"
                        value={governorateId}
                        onChange={(e) => {
                          setGovernorateId(e.target.value)
                          setAreaId('')
                        }}
                      >
                        <option value="">{text.selectPlaceholder}</option>
                        {governorates.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{text.area}</label>
                      <select className="form-select modern-input" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                        <option value="">{text.selectPlaceholder}</option>
                        {filteredAreas.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{text.propertyType}</label>
                      <select className="form-select modern-input" value={propertyTypeId} onChange={(e) => setPropertyTypeId(e.target.value)} required>
                        <option value="">{text.selectPlaceholder}</option>
                        {propertyTypes.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{text.section}</label>
                      <select className="form-select modern-input" value={sectionId} onChange={(e) => setSectionId(e.target.value)} required>
                        <option value="">{text.selectPlaceholder}</option>
                        {sections.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="col-12 landing-form-section">
                <button type="button" className="landing-form-section-header" onClick={() => toggleSection('pricing')}>
                  <span>{text.sectionPricing}</span>
                  <i className={`fas fa-chevron-down landing-form-section-chevron ${expandedSections.pricing ? 'open' : ''}`}></i>
                </button>
                {expandedSections.pricing && (
                  <div className="landing-form-section-body row g-3">
                    <div className="col-md-4">
                      <label className="form-label">{text.price}</label>
                      <input type="number" min="0" className="form-control modern-input" value={price} onChange={(e) => setPrice(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">{text.salePrice}</label>
                      <input type="number" min="0" className="form-control modern-input" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">{text.rentPrice}</label>
                      <input type="number" min="0" className="form-control modern-input" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-12 landing-form-section">
                <button type="button" className="landing-form-section-header" onClick={() => toggleSection('specs')}>
                  <span>{text.sectionSpecs}</span>
                  <i className={`fas fa-chevron-down landing-form-section-chevron ${expandedSections.specs ? 'open' : ''}`}></i>
                </button>
                {expandedSections.specs && (
                  <div className="landing-form-section-body row g-3">
                    <div className="col-md-3">
                      <label className="form-label">{text.size}</label>
                      <input type="number" min="0" className="form-control modern-input" value={size} onChange={(e) => setSize(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{text.baths}</label>
                      <input type="number" min="0" className="form-control modern-input" value={baths} onChange={(e) => setBaths(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{text.rooms}</label>
                      <input type="number" min="0" className="form-control modern-input" value={rooms} onChange={(e) => setRooms(e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">{text.receptions}</label>
                      <input type="number" min="0" className="form-control modern-input" value={receptions} onChange={(e) => setReceptions(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div className="col-12 landing-form-section">
                <button type="button" className="landing-form-section-header" onClick={() => toggleSection('media')}>
                  <span>{text.sectionMedia}</span>
                  <i className={`fas fa-chevron-down landing-form-section-chevron ${expandedSections.media ? 'open' : ''}`}></i>
                </button>
                {expandedSections.media && (
                  <div className="landing-form-section-body row g-3">
                    <div className="col-12">
                      <label className="form-label">{text.images}</label>
                      <input
                        type="file"
                        className="form-control modern-input"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleImageChange}
                      />
                      <small className="text-muted d-block mt-1">{text.imageHint}</small>
                    </div>

                    {imagePreviews.length > 0 && (
                      <div className="col-12">
                        <div className="row g-2">
                          {imagePreviews.map((src, index) => (
                            <div className="col-lg-2 col-md-3 col-4" key={`${src}-${index}`}>
                              <div className="position-relative border rounded overflow-hidden">
                                <img
                                  src={src}
                                  alt={`preview-${index}`}
                                  style={{ width: '100%', height: 110, objectFit: 'cover' }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-dark position-absolute top-0 end-0 m-1"
                                  onClick={() => removeImageAt(index)}
                                >
                                  x
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {status && (
                <div className="col-12">
                  <div className={`landing-contact-status-badge ${status.type}`}>{status.message}</div>
                </div>
              )}

              <div className="col-12 d-grid mt-2">
                <button className="btn btn-primary rounded-pill py-2" type="submit" disabled={loading}>
                  {loading ? text.submitting : text.submit}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="property-panel p-4 p-md-5 mt-4" id="my-properties">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h4 className="mb-1">{text.myPropertiesTitle}</h4>
              <p className="text-muted mb-0">{text.myPropertiesSubtitle}</p>
            </div>
          </div>

          {myPropertiesLoading ? (
            <p className="mb-0 text-muted">Loading...</p>
          ) : myPropertiesUnauthorized ? (
            <div className="landing-contact-status-badge warning">{text.authRequired}</div>
          ) : myProperties.length === 0 ? (
            <p className="mb-0 text-muted">{text.emptyMyProperties}</p>
          ) : (
            <div className="my-properties-grid">
              {myProperties.map((item) => {
                const displayTitle = locale === 'ar' ? item.title_ar || item.title_en : item.title_en || item.title_ar
                const statusValue = String(item.status || 'pending').toLowerCase()
                const statusLabel = text.statusLabels[statusValue] || text.statusLabels.unknown
                return (
                  <div key={item.id} className="my-property-card">
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <h6 className="mb-0">{displayTitle || (locale === 'ar' ? 'عقار بدون عنوان' : 'Untitled property')}</h6>
                      <span className={`my-property-status-chip ${statusValue}`}>{statusLabel}</span>
                    </div>
                    <div className="my-property-meta">
                      {item.code ? <span>#{item.code}</span> : null}
                      {item.location_text ? <span>{item.location_text}</span> : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
