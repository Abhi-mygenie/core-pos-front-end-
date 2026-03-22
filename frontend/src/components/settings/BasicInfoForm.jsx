import { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Building2, Phone, Mail, MapPin, FileText, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const BasicInfoForm = ({ onBack }) => {
  const { restaurant, profile, updateRestaurantLocal } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    slug: '',
    phone: '',
    email: '',
    report_number: '',
    address: '',
    latitude: '',
    longitude: '',
    restaurant_type: '',
    business_type: '',
    fssai: '',
    gst_code: '',
  });

  // Load data from restaurant
  useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        slug: restaurant.slug || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        report_number: restaurant.report_number || '',
        address: restaurant.address || '',
        latitude: restaurant.latitude || '',
        longitude: restaurant.longitude || '',
        restaurant_type: restaurant.restaurant_type || '',
        business_type: restaurant.business_type || '',
        fssai: restaurant.fssai || '',
        gst_code: profile?.gst_code || restaurant.gst_code || '',
      });
    }
  }, [restaurant, profile]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      // await vendorAPI.updateBasicInfo(formData);
      
      // Optimistic update
      updateRestaurantLocal(formData);
      
      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    return `https://preprod.mygenie.online/storage/app/public/restaurant/${imagePath}`;
  };

  return (
    <div className="flex flex-col h-full" data-testid="basic-info-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="basic-info-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Basic Information
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="gap-2"
          style={{ 
            backgroundColor: hasChanges ? COLORS.primaryGreen : COLORS.borderGray,
            color: hasChanges ? 'white' : COLORS.grayText 
          }}
          data-testid="basic-info-save"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Branding Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.grayText }}>
            Branding
          </h3>
          <div className="flex gap-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div 
                className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
                style={{ borderColor: COLORS.borderGray }}
              >
                {restaurant?.logo ? (
                  <img 
                    src={getImageUrl(restaurant.logo)} 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-8 h-8" style={{ color: COLORS.grayText }} />
                )}
              </div>
              <Button variant="outline" size="sm" className="w-24" disabled>
                Change
              </Button>
            </div>

            {/* Cover Photo */}
            <div className="flex-1 space-y-2">
              <Label>Cover Photo</Label>
              <div 
                className="h-24 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden"
                style={{ borderColor: COLORS.borderGray }}
              >
                {restaurant?.cover_photo ? (
                  <img 
                    src={getImageUrl(restaurant.cover_photo)} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center gap-2" style={{ color: COLORS.grayText }}>
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Upload cover photo</span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" disabled>
                Change Cover
              </Button>
            </div>
          </div>
        </section>

        {/* Restaurant Details */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: COLORS.grayText }}>
            <Building2 className="w-4 h-4" />
            Restaurant Details
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Restaurant Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter restaurant name"
                data-testid="input-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of your restaurant"
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                placeholder="restaurant-slug"
                data-testid="input-slug"
              />
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: COLORS.grayText }}>
            <Phone className="w-4 h-4" />
            Contact Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Phone number"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Email address"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report_number">Report Number</Label>
            <Input
              id="report_number"
              value={formData.report_number}
              onChange={(e) => handleChange('report_number', e.target.value)}
              placeholder="Report contact number"
              data-testid="input-report-number"
            />
          </div>
        </section>

        {/* Location */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: COLORS.grayText }}>
            <MapPin className="w-4 h-4" />
            Location
          </h3>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Full address"
              rows={2}
              data-testid="input-address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                value={formData.latitude}
                onChange={(e) => handleChange('latitude', e.target.value)}
                placeholder="e.g. 25.424869"
                data-testid="input-latitude"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                value={formData.longitude}
                onChange={(e) => handleChange('longitude', e.target.value)}
                placeholder="e.g. 81.838576"
                data-testid="input-longitude"
              />
            </div>
          </div>
        </section>

        {/* Business & Compliance */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide flex items-center gap-2" style={{ color: COLORS.grayText }}>
            <FileText className="w-4 h-4" />
            Business & Compliance
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant_type">Restaurant Type</Label>
              <Select 
                value={formData.restaurant_type} 
                onValueChange={(value) => handleChange('restaurant_type', value)}
              >
                <SelectTrigger data-testid="select-restaurant-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Restaurant">Restaurant</SelectItem>
                  <SelectItem value="Cafe">Cafe</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                  <SelectItem value="Cloud Kitchen">Cloud Kitchen</SelectItem>
                  <SelectItem value="Food Truck">Food Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type</Label>
              <Select 
                value={formData.business_type} 
                onValueChange={(value) => handleChange('business_type', value)}
              >
                <SelectTrigger data-testid="select-business-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fssai">FSSAI Number</Label>
              <Input
                id="fssai"
                value={formData.fssai}
                onChange={(e) => handleChange('fssai', e.target.value)}
                placeholder="FSSAI license number"
                data-testid="input-fssai"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst_code">GST Code</Label>
              <Input
                id="gst_code"
                value={formData.gst_code}
                onChange={(e) => handleChange('gst_code', e.target.value)}
                placeholder="GST registration number"
                data-testid="input-gst"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BasicInfoForm;
