// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";


contract TokenTreat is Initializable, ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable, AccessControlUpgradeable, ERC721BurnableUpgradeable, UUPSUpgradeable {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public _nextTokenId;

    enum TreatStatus {
        NONE,
        ACTIVE,
        CLAIMED,
        EXPIRED_REFUNDED
    }

    struct TreatInfo {
        uint256 expiry;
        uint256 amount;
        address tokenAddress;
        TreatStatus status;
        address refundTreasury;
        string treatMetadata;
        bool burnOnClaim;
        bool transferable;
    }

    mapping(uint256 => string) private _tokenURIs;

    mapping(uint256 => TreatInfo) public treatInfo;
    uint256 public platformFee; // 1% Divide by 10000 to get the actual percentage
    uint256 public burnRewardFee; // 10% For Destrying NFT, Divide by 10000 to get the actual percentage

    uint256 public totalPlatformFeeCollected ;
    uint256 public totalBurnRewardFeeDistributed;
    uint256 public totalClaimedTreats;
    uint256 public totalBurntTreats;

    mapping(address => uint256[]) public treatIssuers;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _owner, address minter)
        initializer public
    {
        __ERC721_init("TokenTreat", "Treat");
        __ERC721Enumerable_init();
        __ERC721Pausable_init();
        __AccessControl_init();
        __ERC721Burnable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(UPGRADER_ROLE, _owner);
        _grantRole(MINTER_ROLE, minter);

        platformFee = 100; // 1%
        burnRewardFee = 1000; // 10%
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setPlatformFee(uint256 fee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        platformFee = fee;
    }

    function setRewardFee(uint256 fee) public onlyRole(DEFAULT_ADMIN_ROLE) {
        burnRewardFee = fee;
    }

    function calculatePlatformFee(uint256 amount) public view returns (uint256) {
        return (amount * platformFee) / 10000;
    }

    function calculateBurnRewardFee(uint256 amount) public view returns (uint256) {
        return (amount * burnRewardFee) / 10000;
    }

    event TreatMinted(address indexed from, address indexed to, uint256 tokenId, uint256 indexed expiry, uint256 treatAmount, address treatTokenAddress, string treatMetadata);
    event TreatClaimed(address indexed claimAddress, uint256 tokenId, uint256 treatAmount, address treatTokenAddress, string treatMetadata);
    event TreatDestroyed(address indexed destroyer, uint256 indexed tokenId, uint256 treatAmount, address treatTokenAddress, uint256 destroyReward);
    event MetadataUpdate(uint256 _tokenId);
    error InsufficientMsgValue(uint256 requiredValue,  uint256 passedValue);

    function mintTreat(address to, string memory uri, uint256 expiry,
    uint256 treatAmount, address treatTokenAddress,
    address refundTreasury, bool burnOnClaim, bool transferable, string memory treatMetadata) public payable {
        require(expiry > block.timestamp, "TokenTreat: expiry must be in the future");

        uint256 platformFeeAmount = calculatePlatformFee(treatAmount);

        treatAmount += platformFeeAmount;

        if(treatTokenAddress != address(0)) {
            IERC20 token = IERC20(treatTokenAddress);
            token.transferFrom(msg.sender, address(this), treatAmount);
        }else{
            if(msg.value < treatAmount) {
                revert InsufficientMsgValue(treatAmount, msg.value);
            }
        }

        uint256 finalTreatAmount = treatAmount - platformFeeAmount;
        totalPlatformFeeCollected += platformFeeAmount;

        uint256 tokenId = _nextTokenId++;
        treatInfo[tokenId] = TreatInfo(expiry, finalTreatAmount, treatTokenAddress, TreatStatus.ACTIVE, refundTreasury, treatMetadata, burnOnClaim, transferable);
        if(!transferable){
            treatInfo[tokenId].transferable = true;
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uri);
            treatInfo[tokenId].transferable = false;
        }else{
            _safeMint(to, tokenId);
            _setTokenURI(tokenId, uri);
        }

        treatIssuers[msg.sender].push(tokenId);

        emit TreatMinted(msg.sender, to, tokenId, expiry, finalTreatAmount, treatTokenAddress, treatMetadata);

    }

    function claimTreat(uint256 tokenId) public {
        require(treatInfo[tokenId].expiry > block.timestamp, "TokenTreat: treat expired");
        require(treatInfo[tokenId].status == TreatStatus.ACTIVE, "TokenTreat: treat already claimed or expired");
        treatInfo[tokenId].status = TreatStatus.CLAIMED;
        address _treatOwner = ownerOf(tokenId);
        if(treatInfo[tokenId].tokenAddress != address(0)) {
            IERC20 token = IERC20(treatInfo[tokenId].tokenAddress);
            token.transfer(_treatOwner, treatInfo[tokenId].amount);
        }else{
            payable(_treatOwner).transfer(treatInfo[tokenId].amount);
        }
        if(treatInfo[tokenId].burnOnClaim) {
            _burn(tokenId);
        }

        totalClaimedTreats += 1;

        emit TreatClaimed(_treatOwner, tokenId, treatInfo[tokenId].amount, treatInfo[tokenId].tokenAddress, treatInfo[tokenId].treatMetadata);
    }

    function claimTreatAtAddress(uint256 tokenId, address claimAddress) public {
        require(ownerOf(tokenId) == msg.sender, "TokenTreat: not owner");
        require(treatInfo[tokenId].expiry > block.timestamp, "TokenTreat: treat expired");
        require(treatInfo[tokenId].status == TreatStatus.ACTIVE, "TokenTreat: treat already claimed or expired");
        treatInfo[tokenId].status = TreatStatus.CLAIMED;
        if(treatInfo[tokenId].tokenAddress != address(0)) {
            IERC20 token = IERC20(treatInfo[tokenId].tokenAddress);
            token.transfer(claimAddress, treatInfo[tokenId].amount);
        }else{
            payable(claimAddress).transfer(treatInfo[tokenId].amount);
        }
        if(treatInfo[tokenId].burnOnClaim) {
            _burn(tokenId);
        }

        totalClaimedTreats += 1;

        emit TreatClaimed(claimAddress, tokenId, treatInfo[tokenId].amount, treatInfo[tokenId].tokenAddress, treatInfo[tokenId].treatMetadata);
    }

    function burnTreat(uint256 tokenId) public {
        require( block.timestamp > treatInfo[tokenId].expiry, "TokenTreat: treat not expired");
        require(treatInfo[tokenId].status == TreatStatus.ACTIVE, "TokenTreat: treat already claimed or expired");
        treatInfo[tokenId].status = TreatStatus.EXPIRED_REFUNDED;

        uint256 burnReward = calculateBurnRewardFee(treatInfo[tokenId].amount);
        totalBurnRewardFeeDistributed += burnReward;

        uint256 refundAmount = treatInfo[tokenId].amount - burnReward;

        if(treatInfo[tokenId].tokenAddress != address(0)) {
            IERC20 token = IERC20(treatInfo[tokenId].tokenAddress);
            token.transfer(treatInfo[tokenId].refundTreasury, refundAmount);
            // Send burn reward to msg.sender
            token.transfer(msg.sender, burnReward);
        }else{
            payable(treatInfo[tokenId].refundTreasury).transfer(refundAmount);
            // Send burn reward to msg.sender
            payable(msg.sender).transfer(burnReward);
        }

        treatInfo[tokenId].transferable = true;
        _burn(tokenId);
        treatInfo[tokenId].transferable = false;

        totalBurntTreats += 1;
        emit TreatDestroyed(msg.sender, tokenId, treatInfo[tokenId].amount, treatInfo[tokenId].tokenAddress, burnReward);
    }


    function getAllTreats() public view returns (uint256[] memory) {
        uint256 total = totalSupply();
        uint256[] memory tokens = new uint256[](total);
        for (uint256 i = 0; i < total; i++) {
            tokens[i] = tokenByIndex(i);
        }
        return tokens;
    }

    function getAllTreatsOfOwner(address owner) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokens = new uint256[](balance);
        for (uint256 i = 0; i < balance; i++) {
            tokens[i] = tokenOfOwnerByIndex(owner, i);
        }
        return tokens;
    }

    function getTreatInfo(uint256 tokenId) public view returns (TreatInfo memory treatData, string memory tokenUri) {
        return (treatInfo[tokenId], tokenURI(tokenId));
    }

    function getIssuedTreats(address issuer) public view returns (uint256[] memory) {
        return treatIssuers[issuer];
    }

    function updateTokenUri(uint256 tokenId, string memory uri) public {
        _setTokenURI(tokenId, uri);
    }

    function updateTokenIssuer(address issuer, uint256 tokenId) public {
        treatIssuers[issuer].push(tokenId);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyRole(UPGRADER_ROLE)
        override
    {}

    function ownerOf(uint256 tokenId) public view override(IERC721, ERC721Upgradeable) returns (address) {
        return _ownerOf(tokenId);
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via string.concat).
        if (bytes(_tokenURI).length > 0) {
            return string.concat(base, _tokenURI);
        }

        return super.tokenURI(tokenId);
    }

    /**
     * @dev Sets `_tokenURI` as the tokenURI of `tokenId`.
     *
     * Emits {MetadataUpdate}.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        _tokenURIs[tokenId] = _tokenURI;
        emit MetadataUpdate(tokenId);
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721PausableUpgradeable)
        returns (address)
    {
        // Check if token is transferable
        if(!treatInfo[tokenId].transferable) {
            revert("TokenTreat: token not transferable");
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
