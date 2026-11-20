import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  RotateCcw,
  Sparkles,
  Smile,
  Heart,
  ThumbsUp,
  Flame,
  Utensils,
  Clock,
  Star,
} from 'lucide-react';
import { soundFX } from '../utils/audio';
import { triggerHaptic } from '../utils/telegram';
import { safeStorage } from '../utils/storage';

export const DEFAULT_6_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

const STORAGE_CUSTOM_KEY = 'enmmoe_custom_reactions_v1';
const STORAGE_RECENT_KEY = 'enmmoe_recent_reactions_v1';

export function getStoredQuickReactions(): string[] {
  try {
    const parsed = safeStorage.getJSON<string[] | null>(STORAGE_CUSTOM_KEY, null) ??
      safeStorage.getJSON<string[] | null>('flirthub_custom_reactions_v1', null);
    if (parsed && Array.isArray(parsed) && parsed.length === 6) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_6_REACTIONS;
}

export function saveStoredQuickReactions(reactions: string[]): void {
  safeStorage.setJSON(STORAGE_CUSTOM_KEY, reactions.slice(0, 6));
}

export function getStoredRecentEmojis(): string[] {
  try {
    const parsed = safeStorage.getJSON<string[] | null>(STORAGE_RECENT_KEY, null) ??
      safeStorage.getJSON<string[] | null>('flirthub_recent_reactions_v1', null);
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 24);
    }
  } catch {
    // fallback
  }
  return ['🔥', '✨', '💯', '👏', '😍', '🥳', '👀', '💀', '🙏', '🎉', '🤯', '🥰', '🚀', '💋', '🤩', '🥺', '😎', '💃'];
}

export function saveStoredRecentEmoji(emoji: string): void {
  try {
    const current = getStoredRecentEmojis();
    const next = [emoji, ...current.filter((e) => e !== emoji)].slice(0, 24);
    safeStorage.setJSON(STORAGE_RECENT_KEY, next);
  } catch {
    // ignore
  }
}

export interface EmojiItem {
  char: string;
  name: string;
  category: string;
  keywords: string[];
}

export const EMOJI_DATABASE: EmojiItem[] = [
  // Smileys & Emotion
  { char: '😀', name: 'Grinning', category: 'smileys', keywords: ['smile', 'happy', 'face'] },
  { char: '😃', name: 'Big Eyes Smile', category: 'smileys', keywords: ['happy', 'joy'] },
  { char: '😄', name: 'Smiling Eyes', category: 'smileys', keywords: ['laugh', 'happy'] },
  { char: '😁', name: 'Beaming Smile', category: 'smileys', keywords: ['grin', 'teeth'] },
  { char: '😆', name: 'Squinting Laugh', category: 'smileys', keywords: ['haha', 'lol'] },
  { char: '😅', name: 'Sweat Smile', category: 'smileys', keywords: ['relief', 'whew', 'sweat'] },
  { char: '😂', name: 'Joy / Tears of Joy', category: 'smileys', keywords: ['crying laugh', 'funny', 'haha'] },
  { char: '🤣', name: 'ROFL', category: 'smileys', keywords: ['rolling', 'floor', 'laughing'] },
  { char: '🥲', name: 'Smiling with Tear', category: 'smileys', keywords: ['proud', 'touched'] },
  { char: '☺️', name: 'Smiling Face', category: 'smileys', keywords: ['blush', 'warm'] },
  { char: '😊', name: 'Blushing Smile', category: 'smileys', keywords: ['sweet', 'kind'] },
  { char: '😇', name: 'Innocent Angel', category: 'smileys', keywords: ['halo', 'good'] },
  { char: '🙂', name: 'Slight Smile', category: 'smileys', keywords: ['okay', 'sure'] },
  { char: '🙃', name: 'Upside Down', category: 'smileys', keywords: ['silly', 'sarcastic'] },
  { char: '😉', name: 'Winking', category: 'smileys', keywords: ['flirt', 'joke'] },
  { char: '😌', name: 'Relieved', category: 'smileys', keywords: ['zen', 'calm'] },
  { char: '😍', name: 'Heart Eyes', category: 'smileys', keywords: ['love', 'crush', 'gorgeous'] },
  { char: '🥰', name: 'Hearts Smile', category: 'smileys', keywords: ['adore', 'sweet', 'love'] },
  { char: '😘', name: 'Kiss', category: 'smileys', keywords: ['kiss', 'flirt', 'love'] },
  { char: '😗', name: 'Whistle Kiss', category: 'smileys', keywords: ['duck', 'kiss'] },
  { char: '😙', name: 'Smiling Kiss', category: 'smileys', keywords: ['cute'] },
  { char: '😚', name: 'Closed Eyes Kiss', category: 'smileys', keywords: ['kiss'] },
  { char: '😋', name: 'Yum Delicious', category: 'smileys', keywords: ['tasty', 'silly', 'tongue'] },
  { char: '😛', name: 'Tongue Out', category: 'smileys', keywords: ['silly', 'playful'] },
  { char: '😜', name: 'Winking Tongue', category: 'smileys', keywords: ['crazy', 'party'] },
  { char: '🤪', name: 'Zany Face', category: 'smileys', keywords: ['wild', 'crazy', 'goofy'] },
  { char: '😝', name: 'Squinting Tongue', category: 'smileys', keywords: ['lol', 'goof'] },
  { char: '🤑', name: 'Money Mouth', category: 'smileys', keywords: ['rich', 'dollar', 'cash'] },
  { char: '🤗', name: 'Hugging', category: 'smileys', keywords: ['hug', 'warm', 'welcome'] },
  { char: '🤭', name: 'Giggle / Hand on Mouth', category: 'smileys', keywords: ['oops', 'secret'] },
  { char: '🤫', name: 'Shushing', category: 'smileys', keywords: ['quiet', 'secret', 'shh'] },
  { char: '🤔', name: 'Thinking', category: 'smileys', keywords: ['wonder', 'hmmm', 'ponder'] },
  { char: '🤐', name: 'Zipper Mouth', category: 'smileys', keywords: ['mute', 'sealed'] },
  { char: '🤨', name: 'Raised Eyebrow', category: 'smileys', keywords: ['skeptical', 'doubt'] },
  { char: '😐', name: 'Neutral Face', category: 'smileys', keywords: ['straight', 'okay'] },
  { char: '😑', name: 'Expressionless', category: 'smileys', keywords: ['blank', 'meh'] },
  { char: '😶', name: 'No Mouth', category: 'smileys', keywords: ['speechless'] },
  { char: '😏', name: 'Smirking', category: 'smileys', keywords: ['flirt', 'sly', 'cheeky'] },
  { char: '😒', name: 'Unamused', category: 'smileys', keywords: ['bored', 'annoyed'] },
  { char: '🙄', name: 'Eye Roll', category: 'smileys', keywords: ['whatever', 'duh'] },
  { char: '😬', name: 'Grimacing', category: 'smileys', keywords: ['awkward', 'yikes'] },
  { char: '🤥', name: 'Lying Nose', category: 'smileys', keywords: ['pinocchio', 'fake'] },
  { char: '😌', name: 'Peaceful', category: 'smileys', keywords: ['zen', 'relax'] },
  { char: '😔', name: 'Pensive', category: 'smileys', keywords: ['sad', 'down'] },
  { char: '😪', name: 'Sleepy Tear', category: 'smileys', keywords: ['tired'] },
  { char: '🤤', name: 'Drooling', category: 'smileys', keywords: ['hungry', 'craving'] },
  { char: '😴', name: 'Sleeping', category: 'smileys', keywords: ['zzz', 'bed', 'night'] },
  { char: '😷', name: 'Mask', category: 'smileys', keywords: ['sick', 'doctor'] },
  { char: '🤒', name: 'Thermometer', category: 'smileys', keywords: ['fever', 'sick'] },
  { char: '🤕', name: 'Bandage', category: 'smileys', keywords: ['hurt', 'injured'] },
  { char: '🤢', name: 'Nauseated', category: 'smileys', keywords: ['gross', 'sick'] },
  { char: '🤮', name: 'Vomiting', category: 'smileys', keywords: ['puke', 'disgust'] },
  { char: '🤧', name: 'Sneezing', category: 'smileys', keywords: ['achoo', 'cold'] },
  { char: '🥵', name: 'Hot Face', category: 'smileys', keywords: ['spicy', 'sweat', 'summer'] },
  { char: '🥶', name: 'Cold Face', category: 'smileys', keywords: ['ice', 'freezing', 'winter'] },
  { char: '🥴', name: 'Woozy', category: 'smileys', keywords: ['drunk', 'dizzy', 'tipsy'] },
  { char: '😵', name: 'Dizzy Face', category: 'smileys', keywords: ['knockout', 'faint'] },
  { char: '🤯', name: 'Exploding Head', category: 'smileys', keywords: ['mind blown', 'shock', 'insane'] },
  { char: '🤠', name: 'Cowboy', category: 'smileys', keywords: ['hat', 'yeehaw'] },
  { char: '🥳', name: 'Partying Face', category: 'smileys', keywords: ['celebrate', 'birthday', 'party'] },
  { char: '😎', name: 'Sunglasses', category: 'smileys', keywords: ['cool', 'boss', 'chill'] },
  { char: '🤓', name: 'Nerd', category: 'smileys', keywords: ['geek', 'smart'] },
  { char: '🧐', name: 'Monocle', category: 'smileys', keywords: ['inspect', 'curious'] },
  { char: '😕', name: 'Confused', category: 'smileys', keywords: ['lost', 'huh'] },
  { char: '😟', name: 'Worried', category: 'smileys', keywords: ['nervous'] },
  { char: '🙁', name: 'Slight Frown', category: 'smileys', keywords: ['unhappy'] },
  { char: '😮', name: 'Open Mouth', category: 'smileys', keywords: ['wow', 'surprised', 'gasp'] },
  { char: '😯', name: 'Hushed', category: 'smileys', keywords: ['surprise'] },
  { char: '😲', name: 'Astonished', category: 'smileys', keywords: ['shocked', 'omg'] },
  { char: '😳', name: 'Flushed Eyes', category: 'smileys', keywords: ['blush', 'embarrassed', 'wide'] },
  { char: '🥺', name: 'Pleading Eyes', category: 'smileys', keywords: ['puppy', 'please', 'cute'] },
  { char: '😦', name: 'Frowning Mouth', category: 'smileys', keywords: ['scared'] },
  { char: '😧', name: 'Anguished', category: 'smileys', keywords: ['shock'] },
  { char: '😨', name: 'Fearful', category: 'smileys', keywords: ['scared', 'afraid'] },
  { char: '😰', name: 'Anxious Sweat', category: 'smileys', keywords: ['worried', 'nervous'] },
  { char: '😥', name: 'Sad Relieved', category: 'smileys', keywords: ['whew'] },
  { char: '😢', name: 'Crying', category: 'smileys', keywords: ['sad', 'tear', 'upset'] },
  { char: '😭', name: 'Loudly Crying', category: 'smileys', keywords: ['sob', 'tears', 'crying'] },
  { char: '😱', name: 'Screaming in Fear', category: 'smileys', keywords: ['omg', 'ghost', 'shock'] },
  { char: '😖', name: 'Confounded', category: 'smileys', keywords: ['frustrated'] },
  { char: '😣', name: 'Persevering', category: 'smileys', keywords: ['struggling'] },
  { char: '😞', name: 'Disappointed', category: 'smileys', keywords: ['sad', 'down'] },
  { char: '😓', name: 'Downcast Sweat', category: 'smileys', keywords: ['sigh', 'tired'] },
  { char: '😩', name: 'Weary Face', category: 'smileys', keywords: ['tired', 'frustrated'] },
  { char: '😫', name: 'Tired Face', category: 'smileys', keywords: ['exhausted'] },
  { char: '🥱', name: 'Yawning', category: 'smileys', keywords: ['bored', 'sleepy'] },
  { char: '😤', name: 'Triumph Steam', category: 'smileys', keywords: ['proud', 'angry', 'huff'] },
  { char: '😡', name: 'Pouting Angry', category: 'smileys', keywords: ['mad', 'rage', 'furious'] },
  { char: '😠', name: 'Angry', category: 'smileys', keywords: ['mad', 'annoyed'] },
  { char: '🤬', name: 'Cursing Symbols', category: 'smileys', keywords: ['swear', 'rage', 'furious'] },
  { char: '😈', name: 'Smiling Devil', category: 'smileys', keywords: ['naughty', 'flirt', 'evil'] },
  { char: '👿', name: 'Angry Devil', category: 'smileys', keywords: ['evil', 'demon'] },
  { char: '💀', name: 'Skull / Dead', category: 'smileys', keywords: ['dead', 'skeleton', 'dying'] },
  { char: '☠️', name: 'Skull Crossbones', category: 'smileys', keywords: ['danger', 'pirate'] },
  { char: '💩', name: 'Poop', category: 'smileys', keywords: ['poo', 'funny'] },
  { char: '🤡', name: 'Clown', category: 'smileys', keywords: ['circus', 'fool', 'joke'] },
  { char: '👻', name: 'Ghost', category: 'smileys', keywords: ['spooky', 'halloween', 'boo'] },
  { char: '👽', name: 'Alien', category: 'smileys', keywords: ['ufo', 'space'] },
  { char: '👾', name: 'Alien Monster', category: 'smileys', keywords: ['retro', 'game', 'arcade'] },
  { char: '🤖', name: 'Robot', category: 'smileys', keywords: ['bot', 'ai', 'cyber'] },

  // Hearts & Love
  { char: '❤️', name: 'Red Heart', category: 'hearts', keywords: ['love', 'like', 'passion'] },
  { char: '🧡', name: 'Orange Heart', category: 'hearts', keywords: ['friendship', 'warm'] },
  { char: '💛', name: 'Yellow Heart', category: 'hearts', keywords: ['gold', 'happy', 'friend'] },
  { char: '💚', name: 'Green Heart', category: 'hearts', keywords: ['nature', 'jealous', 'organic'] },
  { char: '💙', name: 'Blue Heart', category: 'hearts', keywords: ['trust', 'cool', 'bro'] },
  { char: '💜', name: 'Purple Heart', category: 'hearts', keywords: ['royal', 'bts', 'glam'] },
  { char: '🖤', name: 'Black Heart', category: 'hearts', keywords: ['dark', 'goth', 'mystery'] },
  { char: '🤍', name: 'White Heart', category: 'hearts', keywords: ['pure', 'peace', 'angel'] },
  { char: '🤎', name: 'Brown Heart', category: 'hearts', keywords: ['coffee', 'chocolate', 'warmth'] },
  { char: '💔', name: 'Broken Heart', category: 'hearts', keywords: ['sad', 'breakup', 'heartbreak'] },
  { char: '❤️‍🔥', name: 'Heart on Fire', category: 'hearts', keywords: ['passion', 'hot', 'desire'] },
  { char: '❤️‍🩹', name: 'Mending Heart', category: 'hearts', keywords: ['healing', 'recovery', 'better'] },
  { char: '❣️', name: 'Heart Exclamation', category: 'hearts', keywords: ['emphasis', 'love'] },
  { char: '💕', name: 'Two Hearts', category: 'hearts', keywords: ['pink', 'floating', 'cute'] },
  { char: '💞', name: 'Revolving Hearts', category: 'hearts', keywords: ['spark', 'crush'] },
  { char: '💓', name: 'Beating Heart', category: 'hearts', keywords: ['pulse', 'vibe'] },
  { char: '💗', name: 'Growing Heart', category: 'hearts', keywords: ['flutter', 'sweet'] },
  { char: '💖', name: 'Sparkling Heart', category: 'hearts', keywords: ['sparkle', 'magic', 'shine'] },
  { char: '💘', name: 'Cupid Arrow Heart', category: 'hearts', keywords: ['crush', 'fall in love', 'valentine'] },
  { char: '💝', name: 'Ribbon Heart', category: 'hearts', keywords: ['gift', 'present', 'sweet'] },
  { char: '💟', name: 'Heart Decoration', category: 'hearts', keywords: ['purple', 'badge'] },
  { char: '💋', name: 'Kiss Mark / Lips', category: 'hearts', keywords: ['flirt', 'sexy', 'lipstick'] },
  { char: '💌', name: 'Love Letter', category: 'hearts', keywords: ['note', 'mail', 'secret'] },

  // Hands & Gestures
  { char: '👍', name: 'Thumbs Up', category: 'hands', keywords: ['yes', 'agree', 'cool', 'like'] },
  { char: '👎', name: 'Thumbs Down', category: 'hands', keywords: ['no', 'dislike', 'bad'] },
  { char: '👌', name: 'OK Hand', category: 'hands', keywords: ['perfect', 'great', 'fine'] },
  { char: '🤌', name: 'Pinched Fingers', category: 'hands', keywords: ['italian', 'chef kiss', 'what'] },
  { char: '🤏', name: 'Pinching Hand', category: 'hands', keywords: ['little', 'tiny', 'bit'] },
  { char: '✌️', name: 'Victory / Peace', category: 'hands', keywords: ['peace', 'v', 'two'] },
  { char: '🤞', name: 'Fingers Crossed', category: 'hands', keywords: ['luck', 'hope', 'wish'] },
  { char: '🤟', name: 'Love-You Gesture', category: 'hands', keywords: ['ily', 'rock', 'love'] },
  { char: '🤘', name: 'Sign of Horns', category: 'hands', keywords: ['rock', 'metal', 'party'] },
  { char: '🤙', name: 'Call Me Hand', category: 'hands', keywords: ['shaka', 'hang loose', 'phone'] },
  { char: '👈', name: 'Point Left', category: 'hands', keywords: ['that way', 'look'] },
  { char: '👉', name: 'Point Right', category: 'hands', keywords: ['there', 'look'] },
  { char: '👆', name: 'Point Up', category: 'hands', keywords: ['up', 'this'] },
  { char: '👇', name: 'Point Down', category: 'hands', keywords: ['below', 'down'] },
  { char: '☝️', name: 'Index Pointing Up', category: 'hands', keywords: ['one', 'attention'] },
  { char: '✋', name: 'Raised Hand', category: 'hands', keywords: ['stop', 'high five'] },
  { char: '🤚', name: 'Raised Back of Hand', category: 'hands', keywords: ['slap', 'stop'] },
  { char: '🖐️', name: 'Splayed Hand', category: 'hands', keywords: ['five', 'hand'] },
  { char: '🖖', name: 'Vulcan Salute', category: 'hands', keywords: ['spock', 'star trek'] },
  { char: '👋', name: 'Waving Hand', category: 'hands', keywords: ['hello', 'hi', 'bye'] },
  { char: '👏', name: 'Clapping Hands', category: 'hands', keywords: ['bravo', 'applause', 'great'] },
  { char: '🙌', name: 'Raising Hands', category: 'hands', keywords: ['praise', 'celebrate', 'cheers'] },
  { char: '👐', name: 'Open Hands', category: 'hands', keywords: ['hug', 'open'] },
  { char: '🤲', name: 'Palms Up Together', category: 'hands', keywords: ['prayer', 'ask'] },
  { char: '🤝', name: 'Handshake', category: 'hands', keywords: ['deal', 'agree', 'partner', 'respect'] },
  { char: '🙏', name: 'Folded Hands', category: 'hands', keywords: ['please', 'thanks', 'namaste', 'pray'] },
  { char: '💪', name: 'Flexed Biceps', category: 'hands', keywords: ['strong', 'gym', 'power', 'muscle'] },
  { char: '🦾', name: 'Mechanical Arm', category: 'hands', keywords: ['bionic', 'cyborg'] },
  { char: '💅', name: 'Nail Polish', category: 'hands', keywords: ['slay', 'queen', 'glam', 'attitude'] },

  // Party & Cool
  { char: '🔥', name: 'Fire / Flame', category: 'cool', keywords: ['lit', 'hot', 'fire', 'awesome'] },
  { char: '✨', name: 'Sparkles', category: 'cool', keywords: ['magic', 'shine', 'clean', 'special'] },
  { char: '💯', name: 'Hundred Points', category: 'cool', keywords: ['100', 'perfect', 'keep it real'] },
  { char: '💥', name: 'Collision / Boom', category: 'cool', keywords: ['bang', 'impact', 'wow'] },
  { char: '💫', name: 'Dizzy Star', category: 'cool', keywords: ['shooting', 'spark'] },
  { char: '🎉', name: 'Party Popper', category: 'cool', keywords: ['celebrate', 'woohoo', 'tada'] },
  { char: '🎊', name: 'Confetti Ball', category: 'cool', keywords: ['celebration', 'festival'] },
  { char: '🍾', name: 'Champagne Bottle', category: 'cool', keywords: ['toast', 'celebrate', 'drink'] },
  { char: '🥂', name: 'Clinking Glasses', category: 'cool', keywords: ['cheers', 'drink', 'toast'] },
  { char: '🍻', name: 'Beer Mugs', category: 'cool', keywords: ['cheers', 'pub', 'party'] },
  { char: '👑', name: 'Crown', category: 'cool', keywords: ['king', 'queen', 'royalty', 'winner'] },
  { char: '🏆', name: 'Trophy', category: 'cool', keywords: ['champion', 'first', 'gold', 'win'] },
  { char: '🥇', name: '1st Place Medal', category: 'cool', keywords: ['gold', 'winner', 'number one'] },
  { char: '🥈', name: '2nd Place Medal', category: 'cool', keywords: ['silver'] },
  { char: '🥉', name: '3rd Place Medal', category: 'cool', keywords: ['bronze'] },
  { char: '💎', name: 'Diamond Gem', category: 'cool', keywords: ['gem', 'luxury', 'expensive', 'vip'] },
  { char: '🚀', name: 'Rocket', category: 'cool', keywords: ['moon', 'to the moon', 'fast', 'launch'] },
  { char: '🎯', name: 'Bullseye / Target', category: 'cool', keywords: ['goal', 'accurate', 'spot on'] },
  { char: '⚡', name: 'High Voltage', category: 'cool', keywords: ['lightning', 'fast', 'shock', 'power'] },
  { char: '⭐', name: 'Star', category: 'cool', keywords: ['fav', 'rating', 'shine'] },
  { char: '🌟', name: 'Glowing Star', category: 'cool', keywords: ['shining', 'special'] },

  // Food & Fun
  { char: '🍕', name: 'Pizza', category: 'food', keywords: ['slice', 'cheese', 'food'] },
  { char: '🍔', name: 'Burger', category: 'food', keywords: ['fast food', 'dinner'] },
  { char: '🍟', name: 'French Fries', category: 'food', keywords: ['snack', 'crispy'] },
  { char: '🌭', name: 'Hot Dog', category: 'food', keywords: ['sausage'] },
  { char: '🍿', name: 'Popcorn', category: 'food', keywords: ['movie', 'drama', 'cinema'] },
  { char: '🍣', name: 'Sushi', category: 'food', keywords: ['japanese', 'fish', 'rice'] },
  { char: '🍦', name: 'Ice Cream', category: 'food', keywords: ['sweet', 'dessert', 'cold'] },
  { char: '🎂', name: 'Birthday Cake', category: 'food', keywords: ['party', 'sweet', 'candles'] },
  { char: '🍰', name: 'Shortcake', category: 'food', keywords: ['dessert', 'slice'] },
  { char: '🍫', name: 'Chocolate Bar', category: 'food', keywords: ['sweet', 'candy'] },
  { char: '🍭', name: 'Lollipop', category: 'food', keywords: ['candy', 'sweet'] },
  { char: '🍷', name: 'Wine Glass', category: 'food', keywords: ['drink', 'alcohol', 'red'] },
  { char: '🍸', name: 'Cocktail', category: 'food', keywords: ['martini', 'bar', 'party'] },
  { char: '🍹', name: 'Tropical Drink', category: 'food', keywords: ['vacation', 'beach', 'summer'] },
  { char: '☕', name: 'Hot Coffee', category: 'food', keywords: ['morning', 'tea', 'cafe'] },
  { char: '🧋', name: 'Boba Bubble Tea', category: 'food', keywords: ['milk tea', 'sweet'] },

  // Fun & Games
  { char: '🎮', name: 'Video Game', category: 'games', keywords: ['play', 'gamer', 'controller'] },
  { char: '🎲', name: 'Game Die', category: 'games', keywords: ['dice', 'luck', 'chance', 'board game'] },
  { char: '🎰', name: 'Slot Machine', category: 'games', keywords: ['777', 'jackpot', 'casino'] },
  { char: '🎳', name: 'Bowling', category: 'games', keywords: ['strike', 'pins'] },
  { char: '⚽', name: 'Soccer Ball', category: 'games', keywords: ['football', 'sport', 'goal'] },
  { char: '🏀', name: 'Basketball', category: 'games', keywords: ['hoop', 'nba', 'dunk'] },
  { char: '🏈', name: 'American Football', category: 'games', keywords: ['touchdown', 'nfl'] },
  { char: '🎾', name: 'Tennis', category: 'games', keywords: ['racket', 'match'] },
  { char: '🎤', name: 'Microphone', category: 'games', keywords: ['sing', 'karaoke', 'music'] },
  { char: '🎧', name: 'Headphones', category: 'games', keywords: ['music', 'listen', 'audio'] },
  { char: '🎸', name: 'Guitar', category: 'games', keywords: ['rock', 'music', 'band'] },
  { char: '🎹', name: 'Musical Keyboard', category: 'games', keywords: ['piano', 'melody'] },
  { char: '💃', name: 'Woman Dancing', category: 'games', keywords: ['dance', 'party', 'salsa'] },
  { char: '🕺', name: 'Man Dancing', category: 'games', keywords: ['disco', 'party'] },
  { char: '🌹', name: 'Rose', category: 'games', keywords: ['flower', 'romance', 'love'] },
  { char: '🌸', name: 'Cherry Blossom', category: 'games', keywords: ['sakura', 'flower', 'spring'] },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'smileys', label: 'Smileys', icon: Smile },
  { id: 'hearts', label: 'Love', icon: Heart },
  { id: 'hands', label: 'Gestures', icon: ThumbsUp },
  { id: 'cool', label: 'Popular', icon: Flame },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'games', label: 'Fun', icon: Star },
];

interface InstagramEmojiPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReaction?: (emoji: string) => void;
  onSelectEmoji?: (emoji: string) => void;
  onQuickReactionsChange?: (reactions: string[]) => void;
  onSaveCustomReactions?: (reactions: string[]) => void;
  theme?: 'light' | 'dark';
}

export const InstagramEmojiPickerModal: React.FC<InstagramEmojiPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectReaction,
  onSelectEmoji,
  onQuickReactionsChange,
  onSaveCustomReactions,
  theme,
}) => {
  const triggerReaction = onSelectReaction || onSelectEmoji || (() => {});
  const triggerSaveReactions = (reactions: string[]) => {
    if (onQuickReactionsChange) onQuickReactionsChange(reactions);
    if (onSaveCustomReactions) onSaveCustomReactions(reactions);
  };
  const [quickReactions, setQuickReactions] = useState<string[]>(() => getStoredQuickReactions());
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => getStoredRecentEmojis());
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Determine light/dark mode from prop or DOM
  const isLight =
    theme === 'light' ||
    (theme !== 'dark' &&
      typeof document !== 'undefined' &&
      !document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (isOpen) {
      setQuickReactions(getStoredQuickReactions());
      setRecentEmojis(getStoredRecentEmojis());
      setSelectedSlotIndex(null);
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  const handleSlotClick = (index: number) => {
    soundFX.playClick();
    triggerHaptic('selection');
    // Toggle slot selection for custom replacement
    setSelectedSlotIndex((prev) => (prev === index ? null : index));
  };

  const handleResetDefaults = () => {
    soundFX.playClick();
    triggerHaptic('medium');
    setQuickReactions(DEFAULT_6_REACTIONS);
    saveStoredQuickReactions(DEFAULT_6_REACTIONS);
    triggerSaveReactions(DEFAULT_6_REACTIONS);
    setSelectedSlotIndex(null);
  };

  const handleEmojiClick = (emoji: string) => {
    soundFX.playClick();
    triggerHaptic('light');

    if (selectedSlotIndex !== null) {
      // Customize mode: replace the clicked quick reaction slot
      const nextReactions = [...quickReactions];
      nextReactions[selectedSlotIndex] = emoji;
      setQuickReactions(nextReactions);
      saveStoredQuickReactions(nextReactions);
      triggerSaveReactions(nextReactions);
      saveStoredRecentEmoji(emoji);
      setRecentEmojis(getStoredRecentEmojis());

      // Advance to next slot or finish
      if (selectedSlotIndex < 5) {
        setSelectedSlotIndex(selectedSlotIndex + 1);
      } else {
        setSelectedSlotIndex(null);
      }
    } else {
      // Direct Pick mode: react / pick emoji
      saveStoredRecentEmoji(emoji);
      triggerReaction(emoji);
      onClose();
    }
  };

  const filteredEmojis = useMemo(() => {
    let list = EMOJI_DATABASE;

    if (activeCategory === 'recent') {
      const recentSet = new Set(recentEmojis);
      const matched = EMOJI_DATABASE.filter((e) => recentSet.has(e.char));
      const existingChars = new Set(matched.map((m) => m.char));
      const extra = recentEmojis
        .filter((r) => !existingChars.has(r))
        .map((r) => ({ char: r, name: 'Recent', category: 'recent', keywords: ['recent'] }));
      return [...matched, ...extra];
    }

    if (activeCategory !== 'all') {
      list = list.filter((e) => e.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q)) ||
          e.char === q
      );
    }

    return list;
  }, [activeCategory, searchQuery, recentEmojis]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-[6px] select-none">
        {/* Backdrop click dismiss */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* SINGLE CLEAN BOARD ONLY */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.98 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className={`relative z-10 w-full max-w-[350px] sm:rounded-3xl rounded-t-3xl p-3 flex flex-col max-h-[82vh] overflow-hidden shadow-2xl border transition-colors duration-150 ${
            isLight
              ? 'bg-[#FFFFFF] text-[#000000] border-zinc-200'
              : 'bg-[#1C1C1E] text-[#FFFFFF] border-white/10'
          }`}
        >
          {/* Top Quick 6 Reaction Slots + Actions (Reset & Close) */}
          <div className="flex items-center gap-1.5 pb-2.5">
            {/* 6 Customizable Reaction Slots */}
            <div
              className={`flex-1 grid grid-cols-6 gap-1 p-1 rounded-2xl border ${
                isLight ? 'bg-[#F2F2F7] border-zinc-200/80' : 'bg-[#2C2C2E]/80 border-white/5'
              }`}
            >
              {quickReactions.map((emoji, idx) => {
                const isSelectedSlot = selectedSlotIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSlotClick(idx)}
                    className={`relative py-1 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${
                      isSelectedSlot
                        ? 'ring-2 ring-[#0A84FF] bg-[#0A84FF]/20 scale-105 shadow-sm'
                        : isLight
                        ? 'hover:bg-white/80'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <span>{emoji}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Reset Button */}
            <button
              type="button"
              onClick={handleResetDefaults}
              aria-label="Reset quick reactions"
              title="Reset defaults"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                isLight
                  ? 'bg-[#F2F2F7] hover:bg-zinc-200 text-zinc-500 hover:text-black border-zinc-200'
                  : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] text-zinc-400 hover:text-white border-white/10'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close emoji picker"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 border ${
                isLight
                  ? 'bg-[#F2F2F7] hover:bg-zinc-200 text-zinc-600 hover:text-black border-zinc-200'
                  : 'bg-[#2C2C2E] hover:bg-[#3A3A3C] text-zinc-300 hover:text-white border-white/10'
              }`}
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0A84FF] transition-colors border ${
                isLight
                  ? 'bg-[#F2F2F7] text-[#000000] placeholder-zinc-400 border-zinc-200'
                  : 'bg-[#2C2C2E] text-[#FFFFFF] placeholder-[#8E8E93] border-white/10'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-current"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Icon Tabs (Clean icons only, no extra text) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    triggerHaptic('light');
                    setActiveCategory(cat.id);
                  }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#0A84FF] text-white border-[#0A84FF] shadow-sm'
                      : isLight
                      ? 'bg-[#F2F2F7] text-zinc-600 hover:text-black border-zinc-200'
                      : 'bg-[#2C2C2E] text-zinc-400 hover:text-white border-white/5'
                  }`}
                  title={cat.label}
                  aria-label={cat.label}
                >
                  <IconComp className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Emoji Grid (Single clean board) */}
          <div
            className={`flex-1 overflow-y-auto max-h-[260px] p-1.5 rounded-2xl border transition-colors ${
              isLight
                ? 'bg-[#F9F9FB] border-zinc-200/80'
                : 'bg-[#141416] border-white/5'
            }`}
          >
            {filteredEmojis.length > 0 ? (
              <div className="grid grid-cols-6 gap-1 text-2xl text-center">
                {filteredEmojis.map((item, index) => (
                  <button
                    key={`${item.char}-${index}`}
                    type="button"
                    onClick={() => handleEmojiClick(item.char)}
                    title={item.name}
                    className={`p-1.5 rounded-xl transition-all flex items-center justify-center cursor-pointer select-none active:scale-85 ${
                      isLight
                        ? 'hover:bg-zinc-200/80'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <span>{item.char}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-[#8E8E93]">
                No emojis
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
