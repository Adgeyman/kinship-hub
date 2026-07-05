import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import CookieBanner from './components/CookieBanner';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Contact from './pages/Contact';
import ResetPassword from './pages/ResetPassword';
import ResetPin from './pages/ResetPin';
import FAQ from './pages/FAQ';
import AddToHomeScreen from './components/AddToHomeScreen';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface FamilyMember {
  id: string;
  name: string;
  avatar_emoji: string;
  color: string;
  role: 'parent' | 'child';
  total_points: number;
}

interface ScheduleEvent {
  id: string;
  title: string;
  family_member_id: string | null;
  time: string;
  day_of_week: number;
  duration_minutes: number;
  event_date: string | null;
}

interface Chore {
  id: string;
  title: string;
  family_member_id: string;
  points: number;
  last_completed: string | null;
  status: 'pending' | 'approved' | 'denied' | 'completed';
  completed_by: string | null;
  completed_at: string | null;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  is_checked: boolean;
}

interface Reward {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  points_cost: number;
}

interface RewardRequest {
  id: string;
  family_member_id: string;
  reward_title: string;
  reward_emoji: string;
  points_cost: number;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
  family_member_name?: string;
  family_member_emoji?: string;
}

// ─────────────────────────────────────────────────────────────
// FREE TIER LIMITS
// ─────────────────────────────────────────────────────────────

const FREE_MEMBER_LIMIT = 4;
const FREE_CHORE_LIMIT = 8;
const FREE_REWARD_LIMIT = 5;

// ─────────────────────────────────────────────────────────────
// SECURITY: CLIENT-SIDE PIN HASHING
// ─────────────────────────────────────────────────────────────

const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`kinshiphub:parentpin:${pin}:v1`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const verifyPin = async (pin: string, storedHash: string): Promise<boolean> => {
  const computed = await hashPin(pin);
  return computed === storedHash;
};

// ─────────────────────────────────────────────────────────────
// AD BANNER
// ─────────────────────────────────────────────────────────────

const AdBanner = () => (
  <div style={S.adBanner}>
    <div style={S.adInner}>
      <span style={S.adLabel}>Ad</span>
      <span style={S.adEmoji}>🌟</span>
      <div style={S.adText}>
        <div style={S.adTitle}>Tools built for neurodivergent learners</div>
        <div style={S.adSub}>Trusted by thousands of ND families</div>
      </div>
      <span style={S.adCTA}>Visit →</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// PIN KEYPAD MODAL
// ─────────────────────────────────────────────────────────────

interface PinModalProps {
  title: string;
  isSettingPin?: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  onForgotPin?: () => void;
  errorMessage?: string;
}

const PinModal: React.FC<PinModalProps> = ({
  title,
  isSettingPin = false,
  onSuccess,
  onCancel,
  onForgotPin,
  errorMessage,
}) => {
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [firstPin, setFirstPin] = useState('');
  const [digits, setDigits] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const prompt = isSettingPin
    ? stage === 'enter'
      ? 'Create a 4-digit parent PIN'
      : 'Confirm your PIN'
    : title;

  const handleDigit = (d: string) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);

    if (next.length === 4) {
      setTimeout(() => {
        if (isSettingPin) {
          if (stage === 'enter') {
            setFirstPin(next);
            setDigits('');
            setStage('confirm');
          } else if (next === firstPin) {
            onSuccess(next);
          } else {
            setMismatch(true);
            setDigits('');
            setFirstPin('');
            setStage('enter');
            setTimeout(() => setMismatch(false), 2500);
          }
        } else {
          onSuccess(next);
        }
      }, 120);
    }
  };

  return (
    <div style={S.pinBackdrop}>
      <div style={S.pinPanel}>
        <div style={S.pinIcon}>🔐</div>
        <div style={S.pinTitle}>{prompt}</div>
        {(mismatch || errorMessage) && (
          <div style={S.pinError}>
            {mismatch ? "PINs didn't match — try again" : errorMessage}
          </div>
        )}
        <div style={S.pinDots}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{ ...S.pinDot, ...(i < digits.length ? S.pinDotOn : {}) }}
            />
          ))}
        </div>
        <div style={S.keypad}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} style={S.keypadBtn} onClick={() => handleDigit(d)}>{d}</button>
          ))}
          <div />
          <button style={S.keypadBtn} onClick={() => handleDigit('0')}>0</button>
          <button style={S.keypadBtn} onClick={() => setDigits(p => p.slice(0, -1))}>⌫</button>
        </div>
        <button style={S.pinCancelBtn} onClick={onCancel}>Cancel</button>
        <button
          style={S.pinForgotBtn}
          onClick={() => {
            onCancel();
            if (onForgotPin) onForgotPin();
          }}
        >
          Forgot PIN?
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

function AppContent() {
  // ── Auth ──────────────────────────────────────────────────
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Data ──────────────────────────────────────────────────
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);

  // ── Premium & PIN ─────────────────────────────────────────
  const [isPremium, setIsPremium] = useState(false);
  const [parentPinHash, setParentPinHash] = useState<string | null>(null);
  const [pinError, setPinError] = useState('');

  // ── Navigation ────────────────────────────────────────────
  const [currentTab, setCurrentTab] = useState<'schedule' | 'chores' | 'shopping' | 'rewards' | 'settings'>('shopping');

  // ── Chore UI ──────────────────────────────────────────────
  const [showAddChoreFor, setShowAddChoreFor] = useState<string | null>(null);
  const [newChoreTitle, setNewChoreTitle] = useState('');
  const [newChorePoints, setNewChorePoints] = useState(10);
  const [pendingChores, setPendingChores] = useState<Chore[]>([]);

  // ── Shopping UI ───────────────────────────────────────────
  const [newShoppingItem, setNewShoppingItem] = useState('');

  // ── Rewards UI ────────────────────────────────────────────
  const [showManageRewards, setShowManageRewards] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardEmoji, setNewRewardEmoji] = useState('🎁');
  const [newRewardCost, setNewRewardCost] = useState(20);

  // ── Schedule UI ───────────────────────────────────────────
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('08:00');
  const [newEventDay, setNewEventDay] = useState(1);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventMemberId, setNewEventMemberId] = useState('');

  // ── Settings UI ───────────────────────────────────────────
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'parent' | 'child'>('child');

  // ── Modals ────────────────────────────────────────────────
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showFeatureGate, setShowFeatureGate] = useState(false);
  const [gatedFeature, setGatedFeature] = useState('');
  const [showPinVerify, setShowPinVerify] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinVerifyTitle, setPinVerifyTitle] = useState('');

  // Ref holds the action to run after successful PIN verify
  const pinActionRef = useRef<(() => void) | null>(null);

  // ── INIT ──────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) bootstrap(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) bootstrap(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const bootstrap = async (userId: string) => {
    await Promise.all([
      loadProfile(userId),
      loadFamilyMembers(userId),
      loadScheduleEvents(userId),
      loadChores(userId),
      loadShoppingList(userId),
      loadRewards(userId),
      loadRewardRequests(userId),
    ]);
  };

  // ── DATA LOADERS ──────────────────────────────────────────

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_premium, parent_pin_hash')
      .eq('id', userId)
      .single();
    if (data) {
      setIsPremium(data.is_premium ?? false);
      setParentPinHash(data.parent_pin_hash ?? null);
    }
  };

  const loadFamilyMembers = async (userId: string) => {
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (data) setFamilyMembers(data);
  };

  const loadScheduleEvents = async (userId: string) => {
    const { data } = await supabase
      .from('schedule_events')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { nullsFirst: false })
      .order('day_of_week')
      .order('time');
    if (data) setScheduleEvents(data);
  };

  const loadChores = async (userId: string) => {
    const { data } = await supabase
      .from('chores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) {
      setChores(data);
      setPendingChores(data.filter((c: Chore) => c.status === 'pending'));
    }
  };

  const loadShoppingList = async (userId: string) => {
    const { data: list } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (list) {
      const { data: items } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('list_id', list.id)
        .order('is_checked')
        .order('name');
      if (items) setShoppingItems(items);
    }
  };

  const loadRewards = async (userId: string) => {
    const { data } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .order('points_cost');
    if (data) setRewards(data);
  };

  const loadRewardRequests = async (userId: string) => {
    const { data } = await supabase
      .from('reward_requests')
      .select('*, family_members(name, avatar_emoji)')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) {
      setRewardRequests(
        data.map((r: any) => ({
          ...r,
          family_member_name: r.family_members?.name,
          family_member_emoji: r.family_members?.avatar_emoji,
        }))
      );
    }
  };

  // ── PREMIUM GATING ────────────────────────────────────────

  const requirePremium = (featureName: string): boolean => {
    if (isPremium) return true;
    setGatedFeature(featureName);
    setShowFeatureGate(true);
    return false;
  };

  // ── PIN GATING ────────────────────────────────────────────

  const requirePin = (title: string, action: () => void) => {
    pinActionRef.current = action;
    setPinVerifyTitle(title);
    if (!parentPinHash) {
      setShowPinSetup(true);
    } else {
      setPinError('');
      setShowPinVerify(true);
    }
  };

  const handlePinVerified = async (enteredPin: string) => {
    const valid = await verifyPin(enteredPin, parentPinHash!);
    if (valid) {
      setShowPinVerify(false);
      setPinError('');
      pinActionRef.current?.();
      pinActionRef.current = null;
    } else {
      setShowPinVerify(false);
      setPinError('Incorrect PIN — try again');
      setTimeout(() => setShowPinVerify(true), 150);
    }
  };

  const handlePinSetup = async (pin: string) => {
    if (!session) return;
    const hash = await hashPin(pin);
    const { error } = await supabase
      .from('profiles')
      .update({ parent_pin_hash: hash })
      .eq('id', session.user.id);
    if (!error) {
      setParentPinHash(hash);
      setShowPinSetup(false);
      pinActionRef.current?.();
      pinActionRef.current = null;
    }
  };

  // ── PIN RECOVERY ──────────────────────────────────────────

  const handleForgotPin = async () => {
    if (!session?.user?.email) {
      alert('No email address found for your account.');
      return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(
      session.user.email,
      {
        redirectTo: `${window.location.origin}/reset-pin`,
      }
    );
    
    if (error) {
      alert('Error sending PIN reset email: ' + error.message);
    } else {
      alert('📧 PIN reset email sent! Check your inbox.');
    }
  };

  // ── FAMILY MEMBERS ────────────────────────────────────────

  const addFamilyMember = async () => {
    if (!newMemberName.trim() || !session) return;
    const avatars = ['👦', '👧', '👨', '👩', '🧒', '🧑', '👴', '👵'];
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];
    await supabase.from('family_members').insert([{
      user_id: session.user.id,
      name: newMemberName.trim(),
      avatar_emoji: avatars[familyMembers.length % avatars.length],
      color: colors[familyMembers.length % colors.length],
      role: newMemberRole,
      total_points: 0,
    }]);
    await loadFamilyMembers(session.user.id);
    setNewMemberName('');
    setNewMemberRole('child');
    setShowAddMember(false);
  };

  // ── CHORES ────────────────────────────────────────────────

  const addChore = async () => {
    if (!newChoreTitle.trim() || !showAddChoreFor || !session) return;
    await supabase.from('chores').insert([{
      user_id: session.user.id,
      family_member_id: showAddChoreFor,
      title: newChoreTitle.trim(),
      points: newChorePoints,
      frequency: 'daily',
      status: 'completed',
    }]);
    await loadChores(session.user.id);
    setNewChoreTitle('');
    setNewChorePoints(10);
    setShowAddChoreFor(null);
  };

  const completeChore = async (choreId: string) => {
    if (!session) return;
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;
    if (chore.status === 'pending' || chore.status === 'approved') return;

    await supabase
      .from('chores')
      .update({
        status: 'pending',
        completed_by: session.user.id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', choreId);

    await loadChores(session.user.id);
    alert('✅ Chore marked as done! Waiting for parent approval.');
  };

  const approveChore = async (chore: Chore) => {
    if (!session) return;
    const today = new Date().toISOString().split('T')[0];
    const member = familyMembers.find(m => m.id === chore.family_member_id);
    
    await Promise.all([
      supabase
        .from('chores')
        .update({
          status: 'approved',
          last_completed: today,
        })
        .eq('id', chore.id),
      member && supabase
        .from('family_members')
        .update({ total_points: member.total_points + chore.points })
        .eq('id', member.id),
    ]);

    await Promise.all([loadChores(session.user.id), loadFamilyMembers(session.user.id)]);
    alert(`✅ ${member?.name} earned ${chore.points} points for "${chore.title}"!`);
  };

  const denyChore = async (choreId: string) => {
    if (!session) return;
    await supabase
      .from('chores')
      .update({ status: 'denied' })
      .eq('id', choreId);

    await loadChores(session.user.id);
    alert('❌ Chore denied. No points awarded.');
  };

  const deleteChore = async (choreId: string) => {
    if (!session) return;
    await supabase.from('chores').delete().eq('id', choreId);
    await loadChores(session.user.id);
  };

  // ── SHOPPING ──────────────────────────────────────────────

  const addShoppingItem = async () => {
    if (!newShoppingItem.trim() || !session) return;
    const { data: list } = await supabase
      .from('shopping_lists')
      .select('id')
      .eq('user_id', session.user.id)
      .single();
    if (list) {
      await supabase.from('shopping_items').insert([{
        list_id: list.id,
        name: newShoppingItem.trim(),
        quantity: 1,
        is_checked: false,
      }]);
      await loadShoppingList(session.user.id);
      setNewShoppingItem('');
    }
  };

  const toggleShoppingItem = async (id: string, checked: boolean) => {
    await supabase.from('shopping_items').update({ is_checked: !checked }).eq('id', id);
    await loadShoppingList(session.user.id);
  };

  const deleteShoppingItem = async (id: string) => {
    await supabase.from('shopping_items').delete().eq('id', id);
    await loadShoppingList(session.user.id);
  };

  const clearCheckedItems = async () => {
    const ids = shoppingItems.filter(i => i.is_checked).map(i => i.id);
    if (!ids.length) return;
    await supabase.from('shopping_items').delete().in('id', ids);
    await loadShoppingList(session.user.id);
  };

  // ── REWARDS ───────────────────────────────────────────────

  const addReward = async () => {
    if (!newRewardTitle.trim() || !session) return;
    if (!isPremium && rewards.length >= FREE_REWARD_LIMIT) {
      requirePremium(`more than ${FREE_REWARD_LIMIT} rewards`);
      return;
    }
    await supabase.from('rewards').insert([{
      user_id: session.user.id,
      title: newRewardTitle.trim(),
      emoji: newRewardEmoji || '🎁',
      points_cost: newRewardCost,
    }]);
    await loadRewards(session.user.id);
    setNewRewardTitle('');
    setNewRewardEmoji('🎁');
    setNewRewardCost(20);
    setShowAddReward(false);
  };

  const deleteReward = async (rewardId: string) => {
    if (!session) return;
    await supabase.from('rewards').delete().eq('id', rewardId);
    await loadRewards(session.user.id);
  };

  const requestReward = async (reward: Reward, memberId: string) => {
    if (!session) return;
    const member = familyMembers.find(m => m.id === memberId);
    if (!member || member.total_points < reward.points_cost) return;
    await supabase.from('reward_requests').insert([{
      user_id: session.user.id,
      family_member_id: memberId,
      reward_id: reward.id,
      reward_title: reward.title,
      reward_emoji: reward.emoji,
      points_cost: reward.points_cost,
      status: 'pending',
    }]);
    await loadRewardRequests(session.user.id);
    alert(`🎁 ${member.name} requested "${reward.title}"! Ask a parent to approve it in Settings.`);
  };

  const approveRequest = async (req: RewardRequest) => {
    if (!session) return;
    const member = familyMembers.find(m => m.id === req.family_member_id);
    if (!member) return;
    await Promise.all([
      supabase.from('reward_requests').update({ status: 'approved' }).eq('id', req.id),
      supabase.from('family_members')
        .update({ total_points: Math.max(0, member.total_points - req.points_cost) })
        .eq('id', member.id),
    ]);
    await Promise.all([loadRewardRequests(session.user.id), loadFamilyMembers(session.user.id)]);
  };

  const denyRequest = async (requestId: string) => {
    if (!session) return;
    await supabase.from('reward_requests').update({ status: 'denied' }).eq('id', requestId);
    await loadRewardRequests(session.user.id);
  };

  // ── SCHEDULE ──────────────────────────────────────────────

  const addScheduleEvent = async () => {
    if (!newEventTitle.trim() || !session) return;
    
    const eventDate = newEventDate || null;
    
    await supabase.from('schedule_events').insert([{
      user_id: session.user.id,
      title: newEventTitle.trim(),
      family_member_id: newEventMemberId || null,
      time: newEventTime,
      day_of_week: newEventDay,
      duration_minutes: 60,
      event_date: eventDate,
    }]);
    
    await loadScheduleEvents(session.user.id);
    setNewEventTitle('');
    setNewEventTime('08:00');
    setNewEventDay(1);
    setNewEventDate('');
    setNewEventMemberId('');
    setShowAddEvent(false);
  };

  const deleteScheduleEvent = async (id: string) => {
    if (!session) return;
    await supabase.from('schedule_events').delete().eq('id', id);
    await loadScheduleEvents(session.user.id);
  };

  // ── CANCEL SUBSCRIPTION ───────────────────────────────────

  const cancelSubscription = async () => {
    if (!session) return;
    if (!confirm('Cancel your subscription? You will lose premium features at the end of the billing period.')) return;
    
    const response = await fetch(
      'https://jzojtkrkzkzukbstbjoq.supabase.co/functions/v1/cancel-subscription',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await response.json();
    if (data.success) {
      alert('Subscription cancelled. You will lose premium features at the end of the billing period.');
      setIsPremium(false);
    } else {
      alert('Error cancelling: ' + (data.error || 'Unknown error'));
    }
  };

  // ── AUTH ──────────────────────────────────────────────────

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    if (isSigningUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setAuthError(error.message);
      } else if (data.user) {
        await Promise.all([
          supabase.from('profiles').insert([{
            id: data.user.id,
            email,
            is_premium: false,
          }]),
          supabase.from('shopping_lists').insert([{
            user_id: data.user.id,
            name: 'Main List',
          }]),
        ]);
        alert('🎉 Account created! Check your email to verify your address, then sign in.');
        setIsSigningUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    }
    setAuthLoading(false);
  };

 const handleForgotPassword = async () => {
  if (!email) {
    alert('Enter your email address first');
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    alert(error.message);
  } else {
    alert('Password reset email sent! Check your inbox.');
  }
};

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setFamilyMembers([]);
    setChores([]);
    setShoppingItems([]);
    setRewards([]);
    setRewardRequests([]);
    setScheduleEvents([]);
    setIsPremium(false);
    setParentPinHash(null);
  };

  // ── HELPERS ───────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const getTodayPoints = (memberId: string) =>
    chores
      .filter(c => c.family_member_id === memberId && c.last_completed === today && c.status === 'approved')
      .reduce((sum, c) => sum + c.points, 0);

  const getCompletionRate = (memberId: string) => {
    const mc = chores.filter(c => c.family_member_id === memberId && c.status !== 'denied');
    if (!mc.length) return 0;
    return Math.round(
      (mc.filter(c => c.last_completed === today && c.status === 'approved').length / mc.length) * 100
    );
  };

  const pendingRequests = rewardRequests.filter(r => r.status === 'pending');

  // ─────────────────────────────────────────────────────────
  // AUTH SCREEN
  // ─────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div style={S.root}>
        <div style={S.authWrap}>
          <div style={S.authHero}>
            <div style={S.authLogoCircle}>🏠</div>
            <h1 style={S.authHeading}>Kinship Hub</h1>
            <p style={S.authTagline}>
              A calm, structured space for neurodivergent families
            </p>
          </div>

          <div style={S.authBody}>
            <div style={S.freePill}>✅ Free forever · No credit card needed</div>

            <form onSubmit={handleAuth} style={S.authForm}>
              {authError && <div style={S.authError}>⚠️ {authError}</div>}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={S.input}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password (min. 8 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={S.input}
                required
                minLength={8}
                autoComplete={isSigningUp ? 'new-password' : 'current-password'}
              />
              <button type="submit" disabled={authLoading} style={S.primaryBtn}>
                {authLoading
                  ? '⏳ Loading…'
                  : isSigningUp
                  ? '🚀 Create Free Account'
                  : '👋 Sign In'}
              </button>
            </form>

            {!isSigningUp && (
              <button onClick={handleForgotPassword} style={S.forgotPasswordBtn}>
                Forgot password?
              </button>
            )}

            <button onClick={() => { setIsSigningUp(v => !v); setAuthError(''); }} style={S.authToggle}>
              {isSigningUp
                ? 'Already have an account? Sign In'
                : 'New here? Create a free account'}
            </button>

            {isSigningUp && (
              <div style={S.authFeatureList}>
                <div style={S.authFeatureItem}>✅ Up to 4 family members free</div>
                <div style={S.authFeatureItem}>✅ Chores, points & rewards</div>
                <div style={S.authFeatureItem}>✅ Shopping list</div>
                <div style={S.authFeatureItem}>✅ Parent PIN protection</div>
                <div style={S.authFeatureItem}>🔒 Your data is private &amp; secure</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // MAIN APP
  // ─────────────────────────────────────────────────────────

  return (
    <div style={S.root}>

      <header style={S.header}>
        <div style={S.headerLeft}>
          <span style={S.headerLogo}>🏠</span>
          <span style={S.headerTitle}>Kinship Hub</span>
        </div>
        <div style={S.headerRight}>
          {isPremium ? (
            <span style={S.premiumChip}>✨ Premium</span>
          ) : (
            <button onClick={() => setShowSubscriptionModal(true)} style={S.upgradeChip}>
              ⬆ Upgrade
            </button>
          )}
        </div>
      </header>

      {!isPremium && <AdBanner />}

      <nav style={S.tabBar}>
        {([
          { id: 'schedule', icon: '📅', label: 'Schedule' },
          { id: 'chores',   icon: '⭐', label: 'Chores' },
          { id: 'shopping', icon: '🛒', label: 'Shopping' },
          { id: 'rewards',  icon: '🎁', label: 'Rewards' },
          { id: 'settings', icon: '⚙️', label: 'Settings', badge: pendingRequests.length + pendingChores.length },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            style={{ ...S.tab, ...(currentTab === tab.id ? S.tabActive : {}) }}
            aria-current={currentTab === tab.id ? 'page' : undefined}
          >
            <span>{tab.icon}</span>
            <span style={S.tabLabel}>{tab.label}</span>
            {(tab as any).badge > 0 && (
              <span style={S.tabBadge}>{(tab as any).badge}</span>
            )}
          </button>
        ))}
      </nav>

      <main style={S.main}>

        {/* SCHEDULE TAB */}
        {currentTab === 'schedule' && (
          <div>
            <div style={S.sectionRow}>
              <h2 style={S.sectionTitle}>📅 Family Schedule</h2>
              <button
                style={S.smallBtn}
                onClick={() => setShowAddEvent(v => !v)}
              >
                + Add
              </button>
            </div>

            {showAddEvent && (
              <div style={S.card}>
                <div style={S.cardTitle}>New Event</div>
                <input
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Morning routine, Homework time, Doctor appointment"
                  style={S.input}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <select
                    value={newEventDay}
                    onChange={e => setNewEventDay(+e.target.value)}
                    style={{ ...S.input, flex: 1 }}
                  >
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    style={{ ...S.input, flex: 1 }}
                  />
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={e => setNewEventDate(e.target.value)}
                    style={S.input}
                  />
                  <small style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Leave blank for weekly recurring event
                  </small>
                </div>
                
                <select
                  value={newEventMemberId}
                  onChange={e => setNewEventMemberId(e.target.value)}
                  style={{ ...S.input, marginTop: '10px' }}
                >
                  <option value="">Whole family</option>
                  {familyMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.avatar_emoji} {m.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button onClick={addScheduleEvent} style={S.smallBtn}>Save</button>
                  <button onClick={() => setShowAddEvent(false)} style={S.ghostBtn}>Cancel</button>
                </div>
              </div>
            )}

            {scheduleEvents.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>📅</div>
                <div style={S.emptyTitle}>No events yet</div>
                <div style={S.emptySubtitle}>
                  Tap + Add to create events for your family
                </div>
              </div>
            ) : (
              <div>
                {(() => {
                  const datedEvents = scheduleEvents.filter(e => e.event_date);
                  const groupedByDate: Record<string, typeof scheduleEvents> = {};
                  datedEvents.forEach(event => {
                    const dateKey = event.event_date!;
                    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
                    groupedByDate[dateKey].push(event);
                  });
                  const sortedDates = Object.keys(groupedByDate).sort();
                  
                  return sortedDates.map(date => (
                    <div key={date} style={S.card}>
                      <div style={S.dayLabel}>
                        📅 {new Date(date).toLocaleDateString('en-GB', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })}
                      </div>
                      {groupedByDate[date].map(evt => {
                        const member = familyMembers.find(m => m.id === evt.family_member_id);
                        return (
                          <div key={evt.id} style={S.eventRow}>
                            <div
                              style={{
                                ...S.eventDot,
                                backgroundColor: member?.color ?? '#94A3B8',
                              }}
                            />
                            <span style={S.eventTime}>{evt.time}</span>
                            <span style={S.eventTitle}>{evt.title}</span>
                            <span style={S.eventMember}>
                              {member ? `${member.avatar_emoji} ${member.name}` : '👨‍👩‍👧 All'}
                            </span>
                            <button
                              onClick={() => deleteScheduleEvent(evt.id)}
                              style={S.deleteBtn}
                            >✕</button>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
                
                {(() => {
                  const recurringEvents = scheduleEvents.filter(e => !e.event_date);
                  if (recurringEvents.length === 0) return null;
                  
                  return (
                    <div style={S.card}>
                      <div style={S.dayLabel}>🔄 Weekly Recurring</div>
                      {DAYS.map((day, i) => {
                        const dayEvents = recurringEvents.filter(e => e.day_of_week === i);
                        if (!dayEvents.length) return null;
                        return (
                          <div key={day}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px', color: '#4F46E5' }}>{day}</div>
                            {dayEvents.map(evt => {
                              const member = familyMembers.find(m => m.id === evt.family_member_id);
                              return (
                                <div key={evt.id} style={S.eventRow}>
                                  <div
                                    style={{
                                      ...S.eventDot,
                                      backgroundColor: member?.color ?? '#94A3B8',
                                    }}
                                  />
                                  <span style={S.eventTime}>{evt.time}</span>
                                  <span style={S.eventTitle}>{evt.title}</span>
                                  <span style={S.eventMember}>
                                    {member ? `${member.avatar_emoji} ${member.name}` : '👨‍👩‍👧 All'}
                                  </span>
                                  <button
                                    onClick={() => deleteScheduleEvent(evt.id)}
                                    style={S.deleteBtn}
                                  >✕</button>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* CHORES TAB */}
        {currentTab === 'chores' && (
          <div>
            <h2 style={S.sectionTitle}>⭐ Family Chores</h2>

            {familyMembers.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>👨‍👩‍👧</div>
                <div style={S.emptyTitle}>No family members yet</div>
                <div style={S.emptySubtitle}>Go to Settings to add your family</div>
              </div>
            ) : (
              familyMembers.map(member => {
                const memberChores = chores.filter(c => c.family_member_id === member.id && c.status !== 'denied');
                const rate = getCompletionRate(member.id);
                const todayPts = getTodayPoints(member.id);
                const allDone = memberChores.length > 0 && rate === 100;

                return (
                  <div key={member.id} style={S.memberCard}>
                    <div style={S.memberCardHeader}>
                      <div
                        style={{
                          ...S.memberAvatar,
                          background: member.color + '22',
                          borderColor: member.color,
                        }}
                      >
                        {member.avatar_emoji}
                      </div>
                      <div style={S.memberCardInfo}>
                        <div style={S.memberCardName}>{member.name}</div>
                        <div style={S.memberCardSub}>
                          ⭐ {member.total_points} total · +{todayPts} today
                        </div>
                      </div>
                      <div
                        style={{
                          ...S.rateBadge,
                          color: allDone ? '#10B981' : rate > 0 ? '#F59E0B' : '#94A3B8',
                        }}
                      >
                        {allDone ? '🌟' : `${rate}%`}
                      </div>
                    </div>

                    <div style={S.progressTrack}>
                      <div
                        style={{
                          ...S.progressFill,
                          width: `${rate}%`,
                          background: allDone ? '#10B981' : '#4F46E5',
                        }}
                      />
                    </div>

                    {memberChores.length === 0 && (
                      <div style={{ padding: '8px 4px', color: '#94A3B8', fontSize: 13 }}>
                        No chores yet — add one below
                      </div>
                    )}
                    {memberChores.map(chore => {
                      const done = chore.last_completed === today && chore.status === 'approved';
                      const isPending = chore.status === 'pending';
                      const isDenied = chore.status === 'denied';

                      let statusLabel = 'Mark complete';
                      if (done) { statusLabel = 'Completed'; }
                      else if (isPending) { statusLabel = 'Pending approval...'; }
                      else if (isDenied) { statusLabel = 'Denied'; }

                      return (
                        <div
                          key={chore.id}
                          style={{ ...S.choreRow, ...(done ? S.choreRowDone : {}) }}
                        >
                          <span
                            style={{
                              ...S.choreText,
                              textDecoration: done ? 'line-through' : 'none',
                              opacity: done || isDenied ? 0.4 : 1,
                            }}
                          >
                            {chore.title}
                          </span>
                          <div style={S.choreRight}>
                            <span style={S.chorePoints}>+{chore.points}⭐</span>
                            <button 
                              onClick={() => {
                                if (isPending || done || isDenied) return;
                                completeChore(chore.id);
                              }} 
                              style={S.checkBtn}
                              title={statusLabel}
                              disabled={isPending || done || isDenied}
                            >
                              {isPending ? '⏳' : done ? '✅' : isDenied ? '❌' : '⬜'}
                            </button>
                            <button onClick={() => { requirePin('Delete chore?', () => deleteChore(chore.id)); }} style={S.deleteChoreBtn}>
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {showAddChoreFor === member.id ? (
                      <div style={S.addChoreForm}>
                        <input
                          autoFocus
                          value={newChoreTitle}
                          onChange={e => setNewChoreTitle(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && addChore()}
                          placeholder="Chore name…"
                          style={S.input}
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                          <label style={S.fieldLabel}>Points:</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={newChorePoints}
                            onChange={e => setNewChorePoints(+e.target.value)}
                            style={{ ...S.input, width: '64px', padding: '6px 8px' }}
                          />
                          <button onClick={addChore} style={S.smallBtn}>Save</button>
                          <button onClick={() => setShowAddChoreFor(null)} style={S.ghostBtn}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        style={S.addChoreBtn}
                        onClick={() => {
                          const count = chores.filter(
                            c => c.family_member_id === member.id && c.status !== 'denied'
                          ).length;
                          if (!isPremium && count >= FREE_CHORE_LIMIT) {
                            requirePremium(`more than ${FREE_CHORE_LIMIT} chores per person`);
                            return;
                          }
                          setShowAddChoreFor(member.id);
                        }}
                      >
                        + Add chore
                        {!isPremium &&
                          chores.filter(c => c.family_member_id === member.id && c.status !== 'denied').length >=
                            FREE_CHORE_LIMIT &&
                          ' 🔒'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SHOPPING TAB */}
        {currentTab === 'shopping' && (
          <div>
            <div style={S.sectionRow}>
              <h2 style={S.sectionTitle}>🛒 Shopping List</h2>
              {shoppingItems.some(i => i.is_checked) && (
                <button onClick={clearCheckedItems} style={S.ghostBtn}>
                  Clear done
                </button>
              )}
            </div>

            <div style={S.addRow}>
              <input
                value={newShoppingItem}
                onChange={e => setNewShoppingItem(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addShoppingItem()}
                placeholder="Add an item…"
                style={{ ...S.input, flex: 1 }}
              />
              <button onClick={addShoppingItem} style={S.smallBtn}>Add</button>
            </div>

            {shoppingItems.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>🛒</div>
                <div style={S.emptyTitle}>List is empty</div>
                <div style={S.emptySubtitle}>Add some items above to get started</div>
              </div>
            ) : (
              <div style={S.card}>
                {shoppingItems.filter(i => !i.is_checked).map(item => (
                  <div key={item.id} style={S.shopRow}>
                    <button
                      onClick={() => toggleShoppingItem(item.id, item.is_checked)}
                      style={S.checkboxBtn}
                      aria-label="Mark as done"
                    >
                      ⬜
                    </button>
                    <span style={S.shopName}>
                      {item.name}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </span>
                    <button
                      onClick={() => deleteShoppingItem(item.id)}
                      style={S.deleteBtn}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {shoppingItems.some(i => i.is_checked) && (
                  <>
                    <div style={S.shopDivider}>✓ Done</div>
                    {shoppingItems.filter(i => i.is_checked).map(item => (
                      <div key={item.id} style={{ ...S.shopRow, opacity: 0.4 }}>
                        <button
                          onClick={() => toggleShoppingItem(item.id, item.is_checked)}
                          style={S.checkboxBtn}
                        >
                          ✅
                        </button>
                        <span style={{ ...S.shopName, textDecoration: 'line-through' }}>
                          {item.name}
                        </span>
                        <button onClick={() => deleteShoppingItem(item.id)} style={S.deleteBtn}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* REWARDS TAB */}
        {currentTab === 'rewards' && (
          <div>
            <div style={S.sectionRow}>
              <h2 style={S.sectionTitle}>🎁 Rewards</h2>
              <button
                style={S.smallBtn}
                onClick={() =>
                  requirePin('Parent PIN required to manage rewards', () =>
                    setShowManageRewards(v => !v)
                  )
                }
              >
                {showManageRewards ? 'Done 🔐' : 'Manage 🔐'}
              </button>
            </div>

            {showManageRewards && (
              <div style={S.card}>
                <div style={S.cardTitle}>Your family's rewards</div>

                {!isPremium && (
                  <div style={S.limitNote}>
                    {rewards.length}/{FREE_REWARD_LIMIT} rewards on Free plan.{' '}
                    <button
                      onClick={() => setShowSubscriptionModal(true)}
                      style={S.inlineLink}
                    >
                      Upgrade
                    </button>{' '}
                    for unlimited.
                  </div>
                )}

                {rewards.map(reward => (
                  <div key={reward.id} style={S.manageRewardRow}>
                    <span style={{ fontSize: 24 }}>{reward.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{reward.title}</div>
                      <div style={{ fontSize: 12, color: '#F59E0B' }}>⭐ {reward.points_cost} pts</div>
                    </div>
                    <button
                      onClick={() =>
                        requirePin('Parent PIN to delete reward', () => deleteReward(reward.id))
                      }
                      style={S.rewardDeleteBtn}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {!showAddReward ? (
                  <button
                    onClick={() => {
                      if (!isPremium && rewards.length >= FREE_REWARD_LIMIT) {
                        requirePremium(`more than ${FREE_REWARD_LIMIT} rewards`);
                        return;
                      }
                      setShowAddReward(true);
                    }}
                    style={S.addChoreBtn}
                  >
                    + Add new reward
                    {!isPremium && rewards.length >= FREE_REWARD_LIMIT ? ' 🔒' : ''}
                  </button>
                ) : (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={newRewardEmoji}
                        onChange={e => setNewRewardEmoji(e.target.value)}
                        placeholder="🎁"
                        style={{ ...S.input, width: 52, textAlign: 'center', padding: '12px 6px' }}
                        maxLength={2}
                      />
                      <input
                        autoFocus
                        value={newRewardTitle}
                        onChange={e => setNewRewardTitle(e.target.value)}
                        placeholder="Reward name…"
                        style={{ ...S.input, flex: 1 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label style={S.fieldLabel}>Cost (⭐):</label>
                      <input
                        type="number"
                        min={1}
                        value={newRewardCost}
                        onChange={e => setNewRewardCost(+e.target.value)}
                        style={{ ...S.input, width: 80 }}
                      />
                      <button onClick={addReward} style={S.smallBtn}>Save</button>
                      <button onClick={() => setShowAddReward(false)} style={S.ghostBtn}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {rewards.length === 0 ? (
              <div style={S.emptyState}>
                <div style={S.emptyIcon}>🎁</div>
                <div style={S.emptyTitle}>No rewards yet</div>
                <div style={S.emptySubtitle}>
                  Tap "Manage 🔐" above to create rewards your family can earn
                </div>
              </div>
            ) : (
              <>
                <div style={S.rewardsGrid}>
                  {rewards.map(reward => (
                    <div key={reward.id} style={S.rewardCard}>
                      <div style={S.rewardEmoji}>{reward.emoji}</div>
                      <div style={S.rewardName}>{reward.title}</div>
                      <div style={S.rewardCost}>⭐ {reward.points_cost} pts</div>
                    </div>
                  ))}
                </div>

                {familyMembers.map(member => (
                  <div key={member.id} style={S.card}>
                    <div style={S.memberCardHeader}>
                      <div
                        style={{
                          ...S.memberAvatar,
                          background: member.color + '22',
                          borderColor: member.color,
                        }}
                      >
                        {member.avatar_emoji}
                      </div>
                      <div style={S.memberCardInfo}>
                        <div style={S.memberCardName}>{member.name}</div>
                        <div style={S.memberCardSub}>
                          ⭐ {member.total_points} pts available
                        </div>
                      </div>
                    </div>
                    <div style={S.claimRow}>
                      {rewards.map(reward => {
                        const canAfford = member.total_points >= reward.points_cost;
                        return (
                          <button
                            key={reward.id}
                            onClick={() => canAfford && requestReward(reward, member.id)}
                            disabled={!canAfford}
                            style={{
                              ...S.claimBtn,
                              ...(canAfford ? S.claimBtnActive : S.claimBtnDisabled),
                            }}
                          >
                            {reward.emoji} {reward.title}
                            <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.7 }}>
                              {reward.points_cost}⭐
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {member.total_points === 0 && (
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
                        Complete chores to earn points 🌟
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {currentTab === 'settings' && (
          <div>
            <div style={{ ...S.card, ...S.subscriptionCard }}>
              {isPremium ? (
                <>
                  <div style={S.subTitle}>✨ Premium Active</div>
                  <p style={S.subText}>
                    You have full access to all Kinship Hub features. Thank you for your support!
                  </p>
                  <button onClick={cancelSubscription} style={S.cancelSubBtn}>
                    Cancel Subscription
                  </button>
                </>
              ) : (
                <>
                  <div style={S.subTitle}>🆓 Free Plan</div>
                  <p style={S.subText}>
                    You're using Kinship Hub for free. Upgrade to remove ads and unlock unlimited features.
                  </p>
                  <button onClick={() => setShowSubscriptionModal(true)} style={S.primaryBtn}>
                    ✨ Upgrade to Premium — £2.99/mo
                  </button>
                </>
              )}
            </div>

            {/* Add to Home Screen - Permanent Instructions */}
            <div style={S.card}>
              <div style={S.cardTitle}>📱 Use as an App</div>
              <p style={S.settingsNote}>
                For the best experience, add Kinship Hub to your phone's home screen. It works just like a real app!
              </p>
              <ul style={{ fontSize: '13px', color: '#64748B', marginLeft: '20px', lineHeight: '1.8' }}>
                <li><strong>iPhone/iPad:</strong> Tap the Share icon (square with arrow) → Scroll down and tap "Add to Home Screen" → Tap "Add"</li>
                <li><strong>Android:</strong> Tap the Menu icon (three dots ⋮) → Tap "Install App" or "Add to Home Screen" → Follow the prompts</li>
              </ul>
            </div>

            {/* PENDING CHORES */}
            {pendingChores.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  ⏳ Pending Chores{' '}
                  <span style={S.badgeInline}>{pendingChores.length}</span>
                </div>
                {pendingChores.map(chore => {
                  const member = familyMembers.find(m => m.id === chore.family_member_id);
                  const child = familyMembers.find(m => m.id === chore.completed_by);
                  return (
                    <div key={chore.id} style={S.requestRow}>
                      <span style={{ fontSize: 28 }}>⭐</span>
                      <div style={S.requestInfo}>
                        <div style={S.requestName}>
                          {member?.avatar_emoji} {member?.name} wants credit for: <strong>{chore.title}</strong>
                        </div>
                        <div style={S.requestMeta}>
                          {chore.points}⭐ · Completed by {child?.name || 'Someone'} ·{' '}
                          {chore.completed_at ? new Date(chore.completed_at).toLocaleDateString('en-GB') : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={S.approveBtn}
                          onClick={() =>
                            requirePin('Approve chore?', () => approveChore(chore))
                          }
                          title="Approve"
                        >
                          ✓
                        </button>
                        <button
                          style={S.denyBtn}
                          onClick={() =>
                            requirePin('Deny chore?', () => denyChore(chore.id))
                          }
                          title="Deny"
                        >
                          ✗
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pendingRequests.length > 0 && (
              <div style={S.card}>
                <div style={S.cardTitle}>
                  🎁 Pending Reward Requests{' '}
                  <span style={S.badgeInline}>{pendingRequests.length}</span>
                </div>
                {pendingRequests.map(req => (
                  <div key={req.id} style={S.requestRow}>
                    <span style={{ fontSize: 28 }}>{req.reward_emoji}</span>
                    <div style={S.requestInfo}>
                      <div style={S.requestName}>
                        {req.family_member_emoji} {req.family_member_name} wants:{' '}
                        <strong>{req.reward_title}</strong>
                      </div>
                      <div style={S.requestMeta}>
                        {req.points_cost}⭐ ·{' '}
                        {new Date(req.created_at).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        style={S.approveBtn}
                        onClick={() =>
                          requirePin('Approve reward request', () => approveRequest(req))
                        }
                        title="Approve"
                      >
                        ✓
                      </button>
                      <button
                        style={S.denyBtn}
                        onClick={() =>
                          requirePin('Deny reward request', () => denyRequest(req.id))
                        }
                        title="Deny"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={S.card}>
              <div style={S.cardTitle}>👨‍👩‍👧 Family Members</div>
              {!isPremium && (
                <div style={S.limitNote}>
                  {familyMembers.length}/{FREE_MEMBER_LIMIT} members on Free plan
                </div>
              )}
              {familyMembers.map(member => (
                <div key={member.id} style={S.memberItem}>
                  <div
                    style={{ ...S.memberAvatarSmall, background: member.color + '22' }}
                  >
                    {member.avatar_emoji}
                  </div>
                  <span style={S.memberItemName}>{member.name}</span>
                  <span style={S.rolePill}>{member.role}</span>
                  <span style={S.memberItemPts}>⭐ {member.total_points}</span>
                </div>
              ))}

              {showAddMember ? (
                <div style={{ marginTop: 12 }}>
                  <input
                    autoFocus
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addFamilyMember()}
                    placeholder="Name"
                    style={S.input}
                  />
                  <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
                    {(['child', 'parent'] as const).map(role => (
                      <button
                        key={role}
                        onClick={() => setNewMemberRole(role)}
                        style={{
                          ...S.roleToggleBtn,
                          ...(newMemberRole === role ? S.roleToggleBtnActive : {}),
                        }}
                      >
                        {role === 'child' ? '🧒 Child' : '👨 Parent'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addFamilyMember} style={S.smallBtn}>Save</button>
                    <button onClick={() => setShowAddMember(false)} style={S.ghostBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  style={{ ...S.smallBtn, marginTop: 10 }}
                  onClick={() =>
                    requirePin('Parent PIN to manage family members', () => {
                      if (!isPremium && familyMembers.length >= FREE_MEMBER_LIMIT) {
                        requirePremium(`more than ${FREE_MEMBER_LIMIT} family members`);
                        return;
                      }
                      setShowAddMember(true);
                    })
                  }
                >
                  + Add family member 🔐
                </button>
              )}
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>🔐 Parent PIN</div>
              <p style={S.settingsNote}>
                {parentPinHash
                  ? 'A parent PIN is set. Children cannot access locked sections.'
                  : 'No PIN set yet. Set one to protect reward approval and family settings.'}
              </p>
              <button
                style={S.ghostBtn}
                onClick={() => {
                  if (parentPinHash) {
                    requirePin('Enter current PIN to change it', () => {
                      setShowPinSetup(true);
                      pinActionRef.current = null;
                    });
                  } else {
                    setShowPinSetup(true);
                    pinActionRef.current = null;
                  }
                }}
              >
                {parentPinHash ? '🔄 Change Parent PIN' : '🔐 Set Parent PIN'}
              </button>
            </div>

            <div style={S.card}>
              <div style={S.cardTitle}>👤 Account</div>
              <div style={S.settingsNote}>{session.user.email}</div>
              <button onClick={handleLogout} style={S.logoutBtn}>Log Out</button>
            </div>
          </div>
        )}

      </main>

      {!isPremium && (currentTab === 'chores' || currentTab === 'shopping') && (
        <AdBanner />
      )}

      {/* PIN SETUP MODAL */}
      {showPinSetup && (
        <PinModal
          title="Create a Parent PIN"
          isSettingPin
          onSuccess={handlePinSetup}
          onCancel={() => {
            setShowPinSetup(false);
            pinActionRef.current = null;
          }}
          onForgotPin={handleForgotPin}
        />
      )}

      {/* PIN VERIFY MODAL */}
      {showPinVerify && (
        <PinModal
          title={pinVerifyTitle}
          onSuccess={handlePinVerified}
          onCancel={() => {
            setShowPinVerify(false);
            setPinError('');
            pinActionRef.current = null;
          }}
          onForgotPin={handleForgotPin}
          errorMessage={pinError}
        />
      )}

      {/* FEATURE GATE MODAL */}
      {showFeatureGate && (
        <div style={S.modalBg}>
          <div style={S.sheet}>
            <div style={S.sheetIcon}>🔒</div>
            <h3 style={S.sheetTitle}>Premium Feature</h3>
            <p style={S.sheetText}>
              <strong>{gatedFeature}</strong> is available on the Premium plan.
            </p>
            <button
              onClick={() => {
                setShowFeatureGate(false);
                setShowSubscriptionModal(true);
              }}
              style={S.primaryBtn}
            >
              ✨ Upgrade to Premium
            </button>
            <button onClick={() => setShowFeatureGate(false)} style={S.ghostBtn}>
              Not now
            </button>
          </div>
        </div>
      )}

      {/* SUBSCRIPTION MODAL - WITH STRIPE INTEGRATION */}
      {showSubscriptionModal && (
        <div style={S.modalBg}>
          <div style={{ ...S.sheet, maxHeight: '94vh', overflowY: 'auto' as const }}>
            <div style={S.sheetHeader}>
              <h3 style={S.sheetTitle}>Choose Your Plan</h3>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                style={S.sheetCloseBtn}
              >
                ✕
              </button>
            </div>

            <div style={S.planRow}>
              {/* Free plan */}
              <div style={S.planCard}>
                <div style={S.planName}>Free</div>
                <div style={S.planPrice}>
                  £0<span style={S.planPer}> forever</span>
                </div>
                {[
                  ['✅', '4 family members'],
                  ['✅', 'Shopping list'],
                  ['✅', '8 chores / person'],
                  ['✅', '5 rewards'],
                  ['✅', 'Points & rewards'],
                  ['🔸', 'Ads shown'],
                  ['❌', 'Unlimited members'],
                  ['❌', 'Full schedule'],
                ].map(([icon, text]) => (
                  <div key={text as string} style={S.planFeature}>
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
                <div style={S.currentPlanBadge}>Current plan</div>
              </div>

              {/* Premium plan */}
              <div style={{ ...S.planCard, ...S.planCardPremium }}>
                <div style={S.premiumPlanName}>✨ Premium</div>
                <div style={S.premiumPlanPrice}>
                  £2.99<span style={S.planPer}>/mo</span>
                </div>
                {[
                  ['✅', 'Unlimited members'],
                  ['✅', 'Shopping list'],
                  ['✅', 'Unlimited chores'],
                  ['✅', 'Unlimited rewards'],
                  ['✅', 'Points & rewards'],
                  ['✅', 'No ads'],
                  ['✅', 'Full schedule'],
                  ['✅', 'Priority support'],
                ].map(([icon, text]) => (
                  <div key={text as string} style={S.planFeature}>
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
                <button
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        alert('Please sign in first');
                        return;
                      }
                      const userId = session.user.id;
                      const priceId = 'price_1TpS96HTEe9TJXX2hO9B9NlP';
                      const successUrl = `${window.location.origin}/settings`;
                      const cancelUrl = `${window.location.origin}/pricing`;
                      const response = await fetch(
                        'https://jzojtkrkzkzukbstbjoq.supabase.co/functions/v1/create-checkout-session',
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            priceId: priceId,
                            userId: userId,
                            successUrl: successUrl,
                            cancelUrl: cancelUrl
                          }),
                        }
                      );
                      const data = await response.json();
                      if (data.url) {
                        window.location.href = data.url;
                      } else if (data.error) {
                        alert('Payment error: ' + data.error);
                      } else {
                        alert('Something went wrong. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Payment error. Please try again.');
                    }
                  }}
                  style={S.upgradePlanBtn}
                >
                  ✨ Upgrade Now — £2.99/mo
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSubscriptionModal(false)}
              style={S.ghostBtn}
            >
              Continue with Free
            </button>
          </div>
        </div>
      )}

      {/* ADD TO HOME SCREEN BANNER */}
      <AddToHomeScreen />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP WITH ROUTER
// ─────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Router>
      <AppContent />
      <CookieBanner />
      <footer style={{
        padding: '16px 24px',
        background: '#F8FAFC',
        borderTop: '1px solid #E2E8F0',
        textAlign: 'center',
        fontSize: '13px',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        flexWrap: 'wrap',
        maxWidth: 440,
        margin: '0 auto'
      }}>
        <Link to="/privacy" style={{ color: '#4F46E5', textDecoration: 'none' }}>Privacy Policy</Link>
        <Link to="/contact" style={{ color: '#4F46E5', textDecoration: 'none' }}>Contact</Link>
        <Link to="/faq" style={{ color: '#4F46E5', textDecoration: 'none' }}>FAQ</Link>
        <span style={{ color: '#64748B' }}>© 2026 Kinship Hub</span>
      </footer>
      <Routes>
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-pin" element={<ResetPin />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </Router>
  );
}

// ─────────────────────────────────────────────────────────────
// DESIGN SYSTEM — All inline styles
// ─────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    maxWidth: 440,
    margin: '0 auto',
    minHeight: '100vh',
    backgroundColor: '#F1F5F9',
    display: 'flex',
    flexDirection: 'column',
    color: '#0F172A',
    position: 'relative',
  },
  authWrap: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: '100vh',
    backgroundColor: '#FFFFFF',
  },
  authHero: {
    background: 'linear-gradient(145deg, #4338CA 0%, #7C3AED 60%, #6D28D9 100%)',
    padding: '52px 28px 44px',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  authLogoCircle: {
    fontSize: 60,
    display: 'block',
    marginBottom: 14,
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))',
  },
  authHeading: {
    fontSize: 34,
    fontWeight: 900,
    margin: '0 0 8px 0',
    color: '#FFFFFF',
    letterSpacing: '-0.5px',
  },
  authTagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    margin: 0,
    lineHeight: 1.55,
  },
  authBody: {
    padding: '28px 24px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  freePill: {
    background: '#ECFDF5',
    color: '#065F46',
    fontSize: 13,
    fontWeight: 700,
    padding: '8px 16px',
    borderRadius: 999,
    textAlign: 'center',
    alignSelf: 'center',
    letterSpacing: 0.2,
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  authError: {
    background: '#FEE2E2',
    color: '#991B1B',
    padding: '12px 14px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
  },
  authToggle: {
    border: 'none',
    background: 'transparent',
    color: '#4F46E5',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'center',
    padding: 4,
  },
  forgotPasswordBtn: {
    background: 'none',
    border: 'none',
    color: '#4F46E5',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'right',
    marginTop: 4,
    textDecoration: 'underline',
  },
  authFeatureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '14px 16px',
    background: '#F8FAFC',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
  },
  authFeatureItem: { fontSize: 14, color: '#334155' },
  input: {
    padding: '13px 14px',
    borderRadius: 12,
    border: '2px solid #E2E8F0',
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    color: '#0F172A',
    transition: 'border-color 0.15s',
  },
  primaryBtn: {
    padding: '15px',
    borderRadius: 14,
    border: 'none',
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
    letterSpacing: 0.2,
  },
  smallBtn: {
    padding: '9px 16px',
    borderRadius: 10,
    border: 'none',
    background: '#4F46E5',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  ghostBtn: {
    padding: '9px 16px',
    borderRadius: 10,
    border: '2px solid #E2E8F0',
    background: 'transparent',
    color: '#475569',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  inlineLink: {
    background: 'none',
    border: 'none',
    color: '#4F46E5',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 'inherit',
    textDecoration: 'underline',
    padding: 0,
  },
  logoutBtn: {
    width: '100%',
    padding: 13,
    borderRadius: 12,
    border: 'none',
    background: '#FEE2E2',
    color: '#DC2626',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
    marginTop: 4,
  },
  cancelSubBtn: {
    width: '100%',
    padding: 13,
    borderRadius: 12,
    border: '2px solid #DC2626',
    background: 'transparent',
    color: '#DC2626',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 14,
    marginTop: 8,
  },
  deleteChoreBtn: {
    background: 'none',
    border: 'none',
    color: '#EF4444',
    cursor: 'pointer',
    fontSize: 16,
    padding: '2px 6px',
    borderRadius: 6,
    fontWeight: 700,
    marginLeft: 4,
  },
  fieldLabel: { fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  header: {
    background: 'linear-gradient(135deg, #4338CA 0%, #7C3AED 100%)',
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(67,56,202,0.3)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  headerLogo: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.3px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 8 },
  premiumChip: {
    background: 'rgba(255,255,255,0.2)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    padding: '5px 10px',
    borderRadius: 999,
    backdropFilter: 'blur(4px)',
  },
  upgradeChip: {
    background: '#FFFFFF',
    color: '#4338CA',
    fontSize: 12,
    fontWeight: 800,
    padding: '5px 12px',
    borderRadius: 999,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  adBanner: {
    background: '#FFFBEB',
    borderTop: '1px solid #FDE68A',
    borderBottom: '1px solid #FDE68A',
    padding: '8px 14px',
  },
  adInner: { display: 'flex', alignItems: 'center', gap: 10 },
  adLabel: {
    fontSize: 9,
    fontWeight: 800,
    color: '#92400E',
    background: '#FDE68A',
    padding: '2px 5px',
    borderRadius: 4,
    flexShrink: 0,
    letterSpacing: 0.5,
  },
  adEmoji: { fontSize: 20, flexShrink: 0 },
  adText: { flex: 1, minWidth: 0 },
  adTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#92400E',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  adSub: { fontSize: 10, color: '#B45309', marginTop: 1 },
  adCTA: { fontSize: 11, fontWeight: 700, color: '#4F46E5', flexShrink: 0, cursor: 'pointer' },
  tabBar: {
    display: 'flex',
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E2E8F0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 4px 8px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 19,
    color: '#94A3B8',
    position: 'relative',
    transition: 'color 0.15s',
  },
  tabActive: {
    color: '#4F46E5',
    background: '#EEF2FF',
    boxShadow: 'inset 0 -3px 0 0 #4F46E5',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.3,
    lineHeight: 1,
  },
  tabBadge: {
    position: 'absolute',
    top: 6,
    right: '14%',
    background: '#EF4444',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 800,
    padding: '1px 5px',
    borderRadius: 999,
    minWidth: 16,
    textAlign: 'center' as const,
    boxShadow: '0 1px 4px rgba(239,68,68,0.5)',
  },
  main: {
    padding: '16px 14px 80px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  sectionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 800,
    margin: '0 0 12px 0',
    color: '#0F172A',
    letterSpacing: '-0.3px',
  },
  card: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#0F172A',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 2px',
    borderBottom: '1px solid #F1F5F9',
  },
  eventDot: { width: 10, height: 10, borderRadius: 999, flexShrink: 0 },
  eventTime: { fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 44 },
  eventTitle: { fontSize: 14, flex: 1, color: '#0F172A' },
  eventMember: { fontSize: 11, color: '#94A3B8' },
  memberCard: {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: '14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
    marginBottom: 10,
  },
  memberCardHeader: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    border: '2px solid',
    flexShrink: 0,
  },
  memberAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  memberCardInfo: { flex: 1 },
  memberCardName: { fontSize: 15, fontWeight: 800, color: '#0F172A' },
  memberCardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  rateBadge: { fontSize: 17, fontWeight: 800 },
  progressTrack: {
    height: 7,
    background: '#F1F5F9',
    borderRadius: 999,
    margin: '6px 0 12px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.4s ease, background 0.3s ease',
  },
  choreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 4px',
    borderBottom: '1px solid #F8FAFC',
    transition: 'opacity 0.2s',
  },
  choreRowDone: { background: '#FAFAFA' },
  choreText: { fontSize: 14, color: '#334155', flex: 1, lineHeight: 1.4 },
  choreRight: { display: 'flex', alignItems: 'center', gap: 8 },
  chorePoints: {
    fontSize: 11,
    fontWeight: 700,
    color: '#D97706',
    background: '#FEF3C7',
    padding: '3px 8px',
    borderRadius: 999,
  },
  checkBtn: {
    background: 'none',
    border: 'none',
    fontSize: 22,
    cursor: 'pointer',
    padding: '2px 4px',
    lineHeight: 1,
  },
  addChoreForm: {
    marginTop: 10,
    padding: '12px',
    background: '#F8FAFC',
    borderRadius: 12,
  },
  addChoreBtn: {
    marginTop: 10,
    padding: '8px 12px',
    background: 'none',
    border: '1.5px dashed #CBD5E1',
    color: '#64748B',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    width: '100%',
    textAlign: 'center' as const,
    transition: 'border-color 0.15s',
  },
  addRow: { display: 'flex', gap: 8, marginBottom: 10 },
  shopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 2px',
    borderBottom: '1px solid #F1F5F9',
    transition: 'opacity 0.2s',
  },
  shopName: { flex: 1, fontSize: 15, color: '#0F172A' },
  checkboxBtn: {
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    padding: '0 2px',
    flexShrink: 0,
    lineHeight: 1,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#CBD5E1',
    cursor: 'pointer',
    fontSize: 13,
    padding: '2px 4px',
    flexShrink: 0,
    fontWeight: 700,
    transition: 'color 0.15s',
  },
  shopDivider: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94A3B8',
    padding: '10px 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  rewardsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  rewardCard: {
    background: '#FFFFFF',
    borderRadius: 14,
    padding: '14px 10px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    textAlign: 'center' as const,
  },
  rewardEmoji: { fontSize: 32, lineHeight: 1 },
  rewardName: { fontSize: 12, fontWeight: 700, color: '#0F172A' },
  rewardCost: { fontSize: 11, color: '#D97706', fontWeight: 700 },
  rewardDeleteBtn: {
    background: '#FEE2E2',
    border: 'none',
    color: '#EF4444',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
    padding: '3px 7px',
    fontWeight: 700,
    flexShrink: 0,
  },
  manageRewardRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  claimRow: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 },
  claimBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'opacity 0.15s',
  },
  claimBtnActive: { background: '#EEF2FF', color: '#4338CA' },
  claimBtnDisabled: { background: '#F8FAFC', color: '#CBD5E1', cursor: 'default' },
  subscriptionCard: {
    background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
    border: '1px solid #C7D2FE',
  },
  subTitle: { fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6 },
  subText: { fontSize: 14, color: '#475569', margin: '0 0 12px 0', lineHeight: 1.5 },
  settingsNote: { fontSize: 13, color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.5 },
  limitNote: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: 600,
    background: '#FFFBEB',
    padding: '6px 10px',
    borderRadius: 8,
    marginBottom: 10,
    border: '1px solid #FDE68A',
  },
  badgeInline: {
    background: '#EF4444',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 800,
    padding: '1px 7px',
    borderRadius: 999,
    marginLeft: 6,
  },
  requestRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 },
  requestMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  approveBtn: {
    background: '#ECFDF5',
    border: 'none',
    color: '#10B981',
    fontWeight: 800,
    fontSize: 17,
    padding: '5px 11px',
    borderRadius: 9,
    cursor: 'pointer',
  },
  denyBtn: {
    background: '#FEF2F2',
    border: 'none',
    color: '#EF4444',
    fontWeight: 800,
    fontSize: 17,
    padding: '5px 11px',
    borderRadius: 9,
    cursor: 'pointer',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  memberItemName: { flex: 1, fontSize: 14, fontWeight: 600, color: '#0F172A' },
  memberItemPts: { fontSize: 12, color: '#64748B' },
  rolePill: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 999,
    background: '#F1F5F9',
    color: '#64748B',
    textTransform: 'capitalize' as const,
  },
  roleToggleBtn: {
    flex: 1,
    padding: '9px',
    borderRadius: 10,
    border: '2px solid #E2E8F0',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 13,
    transition: 'all 0.15s',
  },
  roleToggleBtnActive: {
    border: '2px solid #4F46E5',
    background: '#EEF2FF',
    color: '#4F46E5',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '44px 20px',
    background: '#FFFFFF',
    borderRadius: 16,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  emptyIcon: { fontSize: 42, marginBottom: 10, lineHeight: 1 },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#64748B', lineHeight: 1.55 },
  modalBg: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(3px)',
  },
  sheet: {
    background: '#FFFFFF',
    width: '100%',
    maxWidth: 440,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: '20px 20px 40px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetCloseBtn: {
    background: '#F1F5F9',
    border: 'none',
    borderRadius: 999,
    width: 30,
    height: 30,
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontWeight: 700,
    color: '#475569',
  },
  sheetIcon: { fontSize: 42, textAlign: 'center' as const },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 900,
    margin: 0,
    color: '#0F172A',
    letterSpacing: '-0.3px',
  },
  sheetText: { fontSize: 14, color: '#475569', textAlign: 'center' as const, margin: 0, lineHeight: 1.5 },
  planRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  planCard: {
    border: '2px solid #E2E8F0',
    borderRadius: 16,
    padding: '14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  planCardPremium: {
    border: '2px solid #7C3AED',
    background: 'linear-gradient(145deg, #F5F3FF 0%, #EEF2FF 100%)',
  },
  planName: { fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 2 },
  premiumPlanName: { fontSize: 14, fontWeight: 800, color: '#7C3AED', marginBottom: 2 },
  planPrice: { fontSize: 22, fontWeight: 900, color: '#0F172A', marginBottom: 6 },
  premiumPlanPrice: { fontSize: 22, fontWeight: 900, color: '#7C3AED', marginBottom: 6 },
  planPer: { fontSize: 13, fontWeight: 400, color: '#94A3B8' },
  planFeature: {
    display: 'flex',
    gap: 5,
    fontSize: 11,
    color: '#334155',
    alignItems: 'flex-start',
    lineHeight: 1.4,
  },
  currentPlanBadge: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: 700,
    color: '#64748B',
    textAlign: 'center' as const,
    padding: '7px',
    background: '#F1F5F9',
    borderRadius: 8,
  },
  upgradePlanBtn: {
    marginTop: 6,
    padding: '13px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
    color: '#FFFFFF',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(124,58,237,0.45)',
  },
  pinBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    backdropFilter: 'blur(5px)',
  },
  pinPanel: {
    background: '#FFFFFF',
    borderRadius: 24,
    padding: '28px 24px 22px',
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  },
  pinIcon: { fontSize: 40, lineHeight: 1 },
  pinTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0F172A',
    textAlign: 'center' as const,
    lineHeight: 1.4,
  },
  pinError: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: 600,
    textAlign: 'center' as const,
    background: '#FEE2E2',
    padding: '8px 14px',
    borderRadius: 10,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  pinDots: { display: 'flex', gap: 16 },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    background: '#E2E8F0',
    transition: 'background 0.12s, transform 0.12s',
  },
  pinDotOn: { background: '#4F46E5', transform: 'scale(1.25)' },
  keypad: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
    width: '100%',
  },
  keypadBtn: {
    padding: '14px',
    borderRadius: 14,
    border: '2px solid #E2E8F0',
    background: '#F8FAFC',
    fontSize: 20,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.1s',
    color: '#0F172A',
  },
  pinCancelBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94A3B8',
    fontSize: 14,
    cursor: 'pointer',
    padding: 4,
  },
  pinForgotBtn: {
    border: 'none',
    background: 'transparent',
    color: '#4F46E5',
    fontSize: 13,
    cursor: 'pointer',
    padding: 4,
    textDecoration: 'underline',
    marginTop: 4,
  },
};
