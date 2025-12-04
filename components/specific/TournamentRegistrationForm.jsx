import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Alert,
  ActivityIndicator, ScrollView
} from 'react-native';
import tw from 'twrnc';
import { db } from '../../firebase/firebaseConfig';
import { collection, addDoc, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore'; 
import { useAuth } from '../../context/AuthContext';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from 'moment';
import DropDownPicker from 'react-native-dropdown-picker';

// Helper components (updated)
const FormInput = ({ label, value, onChange, placeholder, keyboardType = 'default', disabled = false }) => (
  <View style={tw`mb-4`}>
    <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>{label}</Text>
    <TextInput
      style={tw.style(
        `border border-gray-300 p-3 rounded-lg text-base bg-white`,
        disabled && `bg-gray-200 text-gray-500`
      )}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      editable={!disabled} // <-- Disable karein
    />
  </View>
);
const DateInput = ({ label, value, onPress, disabled = false }) => (
  <View style={tw`mb-4`}>
    <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>{label}</Text>
    <Pressable onPress={onPress} disabled={disabled}>
      <View style={tw.style(
        `border border-gray-300 p-3 rounded-lg bg-white`,
        disabled && `bg-gray-200`
      )}>
        <Text style={tw.style(`text-base`, disabled && `text-gray-500`)}>
          {moment(value).format('MMMM D, YYYY')}
        </Text>
      </View>
    </Pressable>
  </View>
);

// Dropdown options
const futsalSizes = [
  { label: '2 vs 2', value: '2v2' },
  { label: '3 vs 3', value: '3v3' },
  { label: '4 vs 4', value: '4v4' },
  { label: '5 vs 5', value: '5v5' },
  { label: '6 vs 6', value: '6v6' },
  { label: '7 vs 7', value: '7v7' },
  { label: '8 vs 8', value: '8v8' },
  { label: '9 vs 9', value: '9v9' },
];
const padelSizes = [
  { label: '1 vs 1', value: '1v1' },
  { label: '2 vs 2', value: '2v2' },
];
const cricketSizes = futsalSizes; // Futsal jaisa

// Main Form Component (Updated)
export default function TournamentRegistrationForm({ 
  onSuccess, 
  isEditMode = false, 
  initialData = null 
}) {
  const { user, userData } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields ko initialData se set karein
  const [formData, setFormData] = useState({
    tournamentName: initialData?.tournamentName || '',
    gameType: initialData?.gameType || 'futsal',
    teamSize: initialData?.teamSize || '5v5',
    format: initialData?.format || 'knockout',
    entryFee: initialData?.entryFee?.toString() || '',
    prizeMoney: initialData?.prizeMoney?.toString() || '',
    teamLimit: initialData?.teamLimit?.toString() || '16',
    rules: initialData?.rules || '',
  });

  // Date states ko initialData se set karein
  const [startDate, setStartDate] = useState(initialData?.startDate?.toDate() || moment().startOf('day').toDate());
  const [endDate, setEndDate] = useState(initialData?.endDate?.toDate() || moment().add(2, 'days').endOf('day').toDate());
  const [regDeadline, setRegDeadline] = useState(initialData?.registrationDeadline?.toDate() || moment().add(1, 'day').endOf('day').toDate());

  // Dropdown states
  const [openPicker, setOpenPicker] = useState(null);
  const [gameTypeItems, setGameTypeItems] = useState([
    { label: 'Futsal', value: 'futsal' },
    { label: 'Padel', value: 'padel' },
    { label: 'Cricket', value: 'cricket' },
  ]);
  const [teamSizeItems, setTeamSizeItems] = useState(futsalSizes);
  const [formatItems, setFormatItems] = useState([
    { label: 'Knockout', value: 'knockout' },
    { label: 'Group Stage', value: 'groupstage' },
  ]);
  const [teamLimitItems, setTeamLimitItems] = useState([
    { label: '8 Teams', value: '8' },
    { label: '16 Teams', value: '16' },
    { label: '32 Teams', value: '32' },
    { label: 'Unlimited', value: 'unlimited' },
  ]);
  
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerType, setDatePickerType] = useState('startDate');

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Dynamic team size logic
  useEffect(() => {
    let newSizes = futsalSizes;
    let defaultSize = '5v5';
    if (formData.gameType === 'padel') {
      newSizes = padelSizes;
      defaultSize = '1v1';
    } else if (formData.gameType === 'cricket') {
      newSizes = cricketSizes;
      defaultSize = '5v5';
    }
    setTeamSizeItems(newSizes);
    if (!newSizes.some(item => item.value === formData.teamSize)) {
      handleInputChange('teamSize', defaultSize);
    }
  }, [formData.gameType]);
  
  // Date picker functions
  const showDatePicker = (type) => { setDatePickerType(type); setDatePickerVisible(true); };
  const hideDatePicker = () => setDatePickerVisible(false);
  const handleDateConfirm = (date) => {
    if (datePickerType === 'startDate') setStartDate(moment(date).startOf('day').toDate()); 
    else if (datePickerType === 'endDate') setEndDate(moment(date).endOf('day').toDate());
    else if (datePickerType === 'regDeadline') setRegDeadline(moment(date).endOf('day').toDate());
    hideDatePicker();
  };
  
  // Submit Logic (Create + Edit)
  const handleSubmit = async () => {
    if (!formData.tournamentName || !formData.entryFee || !formData.prizeMoney) {
      Alert.alert('Missing Fields', 'Please fill all required fields.'); return;
    }
    setIsSubmitting(true);
    
    // Data object banayein
    const tournamentData = {
      // (Fields jo edit nahi ho sakti)
      tournamentName: formData.tournamentName,
      gameType: formData.gameType,
      entryFee: parseInt(formData.entryFee, 10),
      prizeMoney: parseInt(formData.prizeMoney, 10),
      
      // (Fields jo edit ho sakti hain)
      teamSize: formData.teamSize,
      format: formData.format,
      teamLimit: formData.teamLimit === 'unlimited' ? null : parseInt(formData.teamLimit, 10),
      rules: formData.rules,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      registrationDeadline: Timestamp.fromDate(regDeadline),
    };

    try {
      if (isEditMode) {
        // --- EDIT MODE ---
        const tourRef = doc(db, 'tournaments', initialData.id);
        await updateDoc(tourRef, tournamentData);
        Alert.alert('Success!', 'Tournament details updated.');
      } else {
        // --- CREATE MODE ---
        const docData = {
          ...tournamentData,
          ownerId: user.uid,
          arenaName: userData.arenaName, 
          arenaId: user.uid, 
          status: 'registration_open',
          registeredTeamCount: 0,
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'tournaments'), docData);
        Alert.alert('Success!', 'Your tournament is now live.');
      }
      
      if (onSuccess) onSuccess(); // Parent ko success batayein

    } catch (error) {
      console.error('Error saving tournament: ', error);
      Alert.alert('Error', isEditMode ? 'Update failed.' : 'Creation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`p-5`} nestedScrollEnabled={true}>
      
      {/* --- Fields (Jo edit nahi ho sakti) --- */}
      <FormInput
        label="Tournament Name"
        value={formData.tournamentName}
        onChange={(val) => handleInputChange('tournamentName', val)}
        disabled={isEditMode} // <-- Disable
      />
      <View style={tw`mb-4 z-50`}>
        <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Game Type</Text>
        <DropDownPicker
          open={openPicker === 'gameType'}
          value={formData.gameType}
          items={gameTypeItems}
          setOpen={() => setOpenPicker(openPicker === 'gameType' ? null : 'gameType')}
          setValue={(callback) => handleInputChange('gameType', callback(formData.gameType))}
          setItems={setGameTypeItems}
          listMode="SCROLLVIEW"
          disabled={isEditMode} // <-- Disable
        />
      </View>
      <FormInput
        label="Entry Fee (PKR)"
        value={formData.entryFee}
        onChange={(val) => handleInputChange('entryFee', val)}
        keyboardType="numeric"
        disabled={isEditMode} // <-- Disable
      />
      <FormInput
        label="Prize Money (PKR)"
        value={formData.prizeMoney}
        onChange={(val) => handleInputChange('prizeMoney', val)}
        keyboardType="numeric"
        disabled={isEditMode} // <-- Disable
      />

      {/* --- Fields (Jo edit ho sakti hain) --- */}
      <View style={tw`mb-4 z-40`}>
        <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Team Size</Text>
        <DropDownPicker
          open={openPicker === 'teamSize'}
          value={formData.teamSize}
          items={teamSizeItems}
          setOpen={() => setOpenPicker(openPicker === 'teamSize' ? null : 'teamSize')}
          setValue={(callback) => handleInputChange('teamSize', callback(formData.teamSize))}
          setItems={setTeamSizeItems}
          listMode="SCROLLVIEW"
        />
      </View>
      <View style={tw`mb-4 z-30`}>
        <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Format</Text>
        <DropDownPicker
          open={openPicker === 'format'}
          value={formData.format}
          items={formatItems}
          setOpen={() => setOpenPicker(openPicker === 'format' ? null : 'format')}
          setValue={(callback) => handleInputChange('format', callback(formData.format))}
          setItems={setFormatItems}
          listMode="SCROLLVIEW"
        />
      </View>
      <View style={tw`mb-4 z-20`}>
        <Text style={tw`text-base font-semibold mb-2 text-gray-700`}>Team Limit</Text>
        <DropDownPicker
          open={openPicker === 'teamLimit'}
          value={formData.teamLimit}
          items={teamLimitItems}
          setOpen={() => setOpenPicker(openPicker === 'teamLimit' ? null : 'teamLimit')}
          setValue={(callback) => handleInputChange('teamLimit', callback(formData.teamLimit))}
          setItems={setTeamLimitItems}
          listMode="SCROLLVIEW"
        />
      </View>
      <DateInput 
        label="Registration Deadline" 
        value={regDeadline} 
        onPress={() => showDatePicker('regDeadline')} 
      />
      <DateInput 
        label="Tournament Start Date" 
        value={startDate} 
        onPress={() => showDatePicker('startDate')} 
      />
      <DateInput 
        label="Tournament End Date" 
        value={endDate} 
        onPress={() => showDatePicker('endDate')} 
      />
      <FormInput
        label="Rules (Optional)"
        value={formData.rules}
        onChange={(val) => handleInputChange('rules', val)}
      />
      
      <Pressable
        style={tw.style(`bg-green-600 py-4 rounded-lg shadow-md mt-4`, isSubmitting && `bg-green-400`)}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color={tw.color('white')} />
        ) : (
          <Text style={tw`text-white text-center text-lg font-bold`}>
            {isEditMode ? 'Update Tournament' : 'Create Tournament'}
          </Text>
        )}
      </Pressable>
      
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={hideDatePicker}
        minimumDate={new Date()} 
      />
    </ScrollView>
  );
}