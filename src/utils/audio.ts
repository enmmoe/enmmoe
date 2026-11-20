/**
 * enmmoe Audio Controller (Silenced / Disabled per project rules)
 */

class SoundEffects {
  private muted: boolean = true;

  public isMuted(): boolean {
    return true;
  }

  public setMuted(_muted: boolean) {
    this.muted = true;
  }

  public toggleMute(): boolean {
    this.muted = true;
    return true;
  }

  public playClick() {}
  public playTone() {}
  public playSpin() {}
  public playReward() {}
  public playSuccess() {}
  public playPremium() {}
  public playLevelUp() {}
  public playJackpot() {}
  public playKiss() {}
  public playGift() {}
  public playPop() {}
  public playMatch() {}
  public playFail() {}
}

export const soundFX = new SoundEffects();
