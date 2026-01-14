// Complete Bangladesh location data with Division > District > Upazila hierarchy

export const DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh'
] as const;

export type Division = typeof DIVISIONS[number];

export const DISTRICTS: Record<Division, string[]> = {
  'Dhaka': ['Dhaka', 'Gazipur', 'Narayanganj', 'Tangail', 'Manikganj', 'Munshiganj', 'Narsingdi', 'Kishoreganj', 'Madaripur', 'Gopalganj', 'Faridpur', 'Rajbari', 'Shariatpur'],
  'Chattogram': ['Chattogram', 'Cox\'s Bazar', 'Comilla', 'Feni', 'Noakhali', 'Lakshmipur', 'Chandpur', 'Brahmanbaria', 'Rangamati', 'Khagrachhari', 'Bandarban'],
  'Rajshahi': ['Rajshahi', 'Bogra', 'Pabna', 'Sirajganj', 'Natore', 'Naogaon', 'Chapainawabganj', 'Joypurhat'],
  'Khulna': ['Khulna', 'Jessore', 'Satkhira', 'Bagerhat', 'Narail', 'Magura', 'Jhenaidah', 'Kushtia', 'Chuadanga', 'Meherpur'],
  'Barishal': ['Barishal', 'Patuakhali', 'Bhola', 'Pirojpur', 'Jhalokati', 'Barguna'],
  'Sylhet': ['Sylhet', 'Moulvibazar', 'Habiganj', 'Sunamganj'],
  'Rangpur': ['Rangpur', 'Dinajpur', 'Kurigram', 'Gaibandha', 'Nilphamari', 'Lalmonirhat', 'Thakurgaon', 'Panchagarh'],
  'Mymensingh': ['Mymensingh', 'Jamalpur', 'Sherpur', 'Netrokona']
};

export const UPAZILAS: Record<string, string[]> = {
  // Dhaka Division
  'Dhaka': ['Dhanmondi', 'Gulshan', 'Mirpur', 'Mohammadpur', 'Uttara', 'Motijheel', 'Ramna', 'Tejgaon', 'Banani', 'Badda', 'Khilgaon', 'Demra', 'Sabujbagh', 'Paltan', 'Lalbagh', 'Hazaribagh', 'Kafrul', 'Pallabi', 'Cantonment', 'Savar', 'Keraniganj', 'Nawabganj', 'Dohar', 'Dhamrai'],
  'Gazipur': ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Kaliganj', 'Tongi'],
  'Narayanganj': ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon'],
  'Tangail': ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Dhanbari'],
  
  // Chattogram Division
  'Chattogram': ['Chattogram Sadar', 'Pahartali', 'Panchlaish', 'Kotwali', 'Halishahar', 'Double Mooring', 'Patenga', 'Banshkhali', 'Anwara', 'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda'],
  'Cox\'s Bazar': ['Cox\'s Bazar Sadar', 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Pekua', 'Ramu', 'Teknaf', 'Ukhia'],
  'Comilla': ['Comilla Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Meghna', 'Monohargonj', 'Muradnagar', 'Nangalkot', 'Titas'],
  
  // Rajshahi Division
  'Rajshahi': ['Rajshahi Sadar', 'Boalia', 'Matihar', 'Rajpara', 'Shah Makhdum', 'Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore'],
  'Bogra': ['Bogra Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
  
  // Khulna Division
  'Khulna': ['Khulna Sadar', 'Daulatpur', 'Khalishpur', 'Khan Jahan Ali', 'Sonadanga', 'Batiaghata', 'Dacope', 'Dighalia', 'Dumuria', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada'],
  'Jessore': ['Jessore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
  
  // Barishal Division
  'Barishal': ['Barishal Sadar', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'],
  
  // Sylhet Division
  'Sylhet': ['Sylhet Sadar', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Osmani Nagar', 'Zakiganj'],
  'Moulvibazar': ['Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Sreemangal'],
  
  // Rangpur Division
  'Rangpur': ['Rangpur Sadar', 'Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
  'Dinajpur': ['Dinajpur Sadar', 'Birampur', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
  
  // Mymensingh Division
  'Mymensingh': ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal', 'Tarakanda'],
  'Jamalpur': ['Jamalpur Sadar', 'Bakshiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari']
};

// Common areas for major cities
export const AREAS: Record<string, string[]> = {
  'Dhanmondi': ['Dhanmondi 1', 'Dhanmondi 2', 'Dhanmondi 5', 'Dhanmondi 7', 'Dhanmondi 8', 'Dhanmondi 9', 'Dhanmondi 10', 'Dhanmondi 12', 'Dhanmondi 15', 'Dhanmondi 27', 'Jigatola', 'Kalabagan', 'Science Lab', 'New Market'],
  'Gulshan': ['Gulshan 1', 'Gulshan 2', 'Gulshan Avenue', 'Niketan', 'North Gulshan', 'South Gulshan'],
  'Mirpur': ['Mirpur 1', 'Mirpur 2', 'Mirpur 6', 'Mirpur 10', 'Mirpur 11', 'Mirpur 12', 'Mirpur 13', 'Mirpur 14', 'Shah Ali', 'Pallabi', 'Kazipara', 'Shewrapara', 'Pirerbag'],
  'Mohammadpur': ['Mohammadpur Town Hall', 'Tajmahal Road', 'Nurjahan Road', 'Iqbal Road', 'Bashbari', 'Shyamoli', 'Adabar', 'Ring Road', 'Sukrabad', 'Shankar'],
  'Uttara': ['Uttara Sector 1', 'Uttara Sector 3', 'Uttara Sector 4', 'Uttara Sector 5', 'Uttara Sector 6', 'Uttara Sector 7', 'Uttara Sector 9', 'Uttara Sector 10', 'Uttara Sector 11', 'Uttara Sector 12', 'Uttara Sector 13', 'Uttara Sector 14', 'Diabari', 'Azampur'],
  'Banani': ['Banani DOHS', 'Banani Block A', 'Banani Block B', 'Banani Block C', 'Banani Block D', 'Banani Block E', 'Banani Block F', 'Banani Block G', 'Chairman Bari', 'Kamal Ataturk Avenue'],
  'Badda': ['Badda', 'Middle Badda', 'North Badda', 'South Badda', 'Merul Badda', 'Aftab Nagar', 'Rampura', 'Banasree'],
  'Chattogram Sadar': ['GEC Circle', 'Agrabad', 'Nasirabad', 'Khulshi', 'Panchlaish', 'Halishahar', 'Bayezid', 'Oxygen', 'Muradpur', 'Chawkbazar', 'Anderkilla', 'Kazir Dewri', 'Lalkhanbazar'],
  'Sylhet Sadar': ['Zindabazar', 'Bondor', 'Amberkhana', 'Shibganj', 'Laldighirpar', 'Subid Bazar', 'Upashahar', 'Tilagorh', 'Kumarpara', 'Medical Road']
};

export function getDistricts(division: string): string[] {
  return DISTRICTS[division as Division] || [];
}

export function getUpazilas(district: string): string[] {
  return UPAZILAS[district] || [];
}

export function getAreas(upazila: string): string[] {
  return AREAS[upazila] || [];
}
